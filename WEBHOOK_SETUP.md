# WhatsApp Webhook Setup Guide

## Development Setup (using ngrok)

### 1. Install ngrok
```bash
# Install ngrok (if not installed)
npm install -g ngrok
# or
brew install ngrok
```

### 2. Start Your Backend
```bash
cd backend
npm run dev  # Starts on http://localhost:3000
```

### 3. Expose to Internet with ngrok
```bash
# In another terminal
ngrok http 3000
```

This gives you a URL like: `https://abc123.ngrok-free.app`

### 4. Configure Webhook in Meta
Go to **Meta for Developers** → **WhatsApp** → **Configuration**:

- **Webhook URL**: `https://abc123.ngrok-free.app/webhook`
- **Verify Token**: Use your `WHATSAPP_VERIFY_TOKEN` value
- **Subscribe to**: `messages` and `message_status`

### 5. Test Webhook Verification
Meta will send a GET request to verify your webhook.
Check your backend logs - should see:
```
✅ Webhook verified successfully
```

## Production Setup

### 1. Deploy Your Backend
Deploy to your hosting platform (Railway, Render, etc.)

### 2. Configure Production Webhook
- **Webhook URL**: `https://yourdomain.com/webhook`
- **Verify Token**: Same as development

## Testing the Webhook

### Test 1: Verification
```bash
# Should return the challenge
curl "https://your-webhook-url/webhook?hub.mode=subscribe&hub.challenge=test&hub.verify_token=your_verify_token"
```

### Test 2: Message Webhook
Check logs when you send WhatsApp messages - should see:
```
📱 Received WhatsApp message from +1234567890
🤖 Processing conversation for customer...
📤 Sent response: Welcome to Demo Restaurant!
```