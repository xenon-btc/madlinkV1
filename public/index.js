const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

const app = express();
admin.initializeApp();

app.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Webhook secret is not configured');
    return res.status(500).send('Webhook secret is not configured');
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        if (session.payment_status === 'paid') {
          await handleCheckoutCompleted(session);
        }
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send(`Webhook Error: ${error.message}`);
  }
});

async function handleCheckoutCompleted(session) {
  const { customer, client_reference_id } = session;
  
  if (!client_reference_id) {
    throw new Error('No client reference ID found');
  }

  console.log(`Processing checkout completion for user ${client_reference_id}`);

  const userRef = admin.firestore().collection('users').doc(client_reference_id);
  
  await userRef.update({
    stripeCustomerId: customer,
    payment_status: 'paid',
    hasUsedTrial: true, // Marquer que l'utilisateur a utilisé sa période d'essai
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log(`Updated payment status for user ${client_reference_id}`);

  try {
    await admin.auth().revokeRefreshTokens(client_reference_id);
    console.log(`Revoked refresh tokens for user ${client_reference_id}`);
  } catch (error) {
    console.error('Error revoking refresh tokens:', error);
  }
}

async function handleSubscriptionUpdated(subscription) {
  const { customer, status } = subscription;
  
  const snapshot = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customer)
    .get();
  
  if (snapshot.empty) {
    throw new Error('No user found with this Stripe customer ID');
  }

  const userDoc = snapshot.docs[0];
  const userId = userDoc.id;
  
  await userDoc.ref.update({
    payment_status: status === 'active' ? 'paid' : 'unpaid',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  try {
    await admin.auth().revokeRefreshTokens(userId);
  } catch (error) {
    console.error('Error revoking refresh tokens:', error);
  }
}

async function handleSubscriptionCanceled(subscription) {
  const { customer } = subscription;
  
  const snapshot = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customer)
    .get();
  
  if (snapshot.empty) {
    throw new Error('No user found with this Stripe customer ID');
  }

  const userDoc = snapshot.docs[0];
  const userId = userDoc.id;
  
  await userDoc.ref.update({
    payment_status: 'unpaid',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  try {
    await admin.auth().revokeRefreshTokens(userId);
  } catch (error) {
    console.error('Error revoking refresh tokens:', error);
  }
}

async function handlePaymentFailed(invoice) {
  const { customer } = invoice;
  
  const snapshot = await admin.firestore()
    .collection('users')
    .where('stripeCustomerId', '==', customer)
    .get();
  
  if (snapshot.empty) {
    throw new Error('No user found with this Stripe customer ID');
  }

  const userDoc = snapshot.docs[0];
  const userId = userDoc.id;
  
  await userDoc.ref.update({
    payment_status: 'unpaid',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  try {
    await admin.auth().revokeRefreshTokens(userId);
  } catch (error) {
    console.error('Error revoking refresh tokens:', error);
  }
}

exports.stripeWebhook = onRequest({
  region: 'europe-west1',
  memory: '256MiB',
  rawBody: true
}, app);

exports.sendContactEmail = onRequest({
  region: 'europe-west1',
  memory: '256MiB',
  cors: true
}, async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_name, user_email, subject, message } = req.body;

    if (!user_name || !user_email || !subject || !message) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    if (!BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY is not configured');
    }

    // Envoyer l'email via Brevo
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: 'MadlinK Contact Form',
          email: 'contact@madlink.fr',
        },
        to: [
          {
            email: 'contact@madlink.fr',
            name: 'MadlinK Support',
          },
        ],
        replyTo: {
          email: user_email,
          name: user_name,
        },
        subject: `[Contact MadlinK] ${subject}`,
        htmlContent: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #2563eb 0%, #60a5fa 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
                .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
                .info { background: white; padding: 15px; border-left: 4px solid #2563eb; margin: 10px 0; border-radius: 4px; }
                .message-box { background: white; padding: 15px; margin-top: 15px; border-radius: 4px; border: 1px solid #e5e7eb; }
                .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2 style="margin: 0;">Nouveau message de contact</h2>
                </div>
                <div class="content">
                  <div class="info">
                    <p style="margin: 5px 0;"><strong>De:</strong> ${user_name}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${user_email}">${user_email}</a></p>
                    <p style="margin: 5px 0;"><strong>Sujet:</strong> ${subject}</p>
                  </div>
                  <div class="message-box">
                    <p><strong>Message:</strong></p>
                    <p>${message.replace(/\n/g, '<br>')}</p>
                  </div>
                  <div class="footer">
                    <p>Ce message a été envoyé depuis le formulaire de contact de MadlinK</p>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `,
        textContent: `Nouveau message de contact\n\nDe: ${user_name}\nEmail: ${user_email}\nSujet: ${subject}\n\nMessage:\n${message}`,
      }),
    });

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.text();
      console.error('Erreur Brevo:', errorData);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }

    const brevoData = await brevoResponse.json();
    console.log('Email envoyé avec succès:', brevoData);

    // Sauvegarder le message dans Firestore
    await admin.firestore().collection('contact_messages').add({
      user_name,
      user_email,
      subject,
      message,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({
      success: true,
      message: 'Email envoyé avec succès',
      messageId: brevoData.messageId
    });
  } catch (error) {
    console.error('Erreur:', error);
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    });
  }
});

exports.cleanupInactiveAccounts = onSchedule({
  schedule: '0 0 1 * *',
  timeZone: 'Europe/Paris',
  region: 'europe-west1',
  memory: '2GB',
  timeoutSeconds: 540
}, async (context) => {
  const now = new Date();
  const fourMonthsAgo = new Date(now.getTime() - 4 * 30 * 24 * 60 * 60 * 1000);

  try {
    const snapshot = await admin.firestore()
      .collection('users')
      .where('payment_status', '==', 'unpaid')
      .where('updatedAt', '<=', fourMonthsAgo)
      .get();

    const batch = admin.firestore().batch();
    const promises = [];

    for (const doc of snapshot.docs) {
      const userId = doc.id;
      const userData = doc.data();

      if (userData.photos) {
        promises.push(
          admin.storage()
            .bucket()
            .deleteFiles({ prefix: `interventions/${userId}` })
        );
      }

      const collections = ['interventions', 'expenses', 'intervention_types'];
      for (const collectionName of collections) {
        const collectionSnapshot = await admin.firestore()
          .collection(collectionName)
          .where('userId', '==', userId)
          .get();
        
        collectionSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
      }

      batch.delete(doc.ref);
      promises.push(admin.auth().deleteUser(userId));
    }

    await Promise.all([batch.commit(), ...promises]);
    console.log(`Cleaned up ${snapshot.size} inactive accounts`);
    return null;
  } catch (error) {
    console.error('Error cleaning up inactive accounts:', error);
    throw error;
  }
});