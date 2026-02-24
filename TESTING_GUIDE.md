# WhatsApp Bot Testing Guide

## 📱 Test Phone Numbers

### Development/Sandbox Testing

**Meta provides a test phone number:**
- **Business Phone**: `+1 415-523-8886` (provided by Meta)
- **Your Test Number**: Use your personal WhatsApp number
- **Additional Test Numbers**: You can add up to 5 phone numbers for testing

### How to Add Test Numbers:
1. **Meta for Developers** → **WhatsApp** → **API Setup**
2. **Step 5: Add recipient phone number**
3. Enter phone numbers that can receive test messages
4. **Send code** → Enter verification code from WhatsApp

### Test Numbers You Can Use:
- ✅ Your personal WhatsApp number
- ✅ Team members' WhatsApp numbers
- ✅ Any number you can verify with SMS/WhatsApp

## 🧪 Testing Scenarios

### Test 1: Basic Message Flow
```
Customer → Bot: "Hi"
Bot → Customer: "Welcome to Demo Restaurant! 🍽️"
```

### Test 2: Menu Browsing
```
Customer: "Show menu"
Bot: "Here are our categories: [Appetizers] [Main Dishes] [Desserts]"
Customer: "Main Dishes"
Bot: "🍗 Grilled Chicken - $24.99\n🥩 Beef Stir Fry - $28.99"
```

### Test 3: Order Flow
```
Customer: "I want Grilled Chicken"
Bot: "How many Grilled Chicken would you like?"
Customer: "2"
Bot: "Added 2x Grilled Chicken ($49.98). Add more items or type 'checkout'?"
```

## 🔍 Debugging Tools

### Backend Logs to Watch:
```bash
npm run dev
# Look for:
# 📱 Incoming message: {...}
# 🤖 Processing conversation state: WELCOME
# 📤 Sending response: {...}
```

### Database Monitoring:
```sql
-- Check conversations in real-time
SELECT
  c.name as customer,
  conv.state,
  conv.context,
  conv.last_message_at
FROM conversations conv
JOIN customers c ON c.id = conv.customer_id
ORDER BY conv.last_message_at DESC
LIMIT 5;

-- Check recent orders
SELECT
  o.order_number,
  c.name,
  o.status,
  o.total_amount,
  o.created_at
FROM orders o
JOIN customers c ON c.id = o.customer_id
ORDER BY o.created_at DESC
LIMIT 5;
```

### Common Issues & Solutions:

**Issue**: "Webhook not receiving messages"
- ✅ Check ngrok is running and URL is correct
- ✅ Verify webhook URL in Meta console
- ✅ Check WHATSAPP_VERIFY_TOKEN matches

**Issue**: "Bot not responding"
- ✅ Check backend logs for errors
- ✅ Verify WHATSAPP_TOKEN is valid
- ✅ Ensure restaurant has whatsapp_phone_number_id set

**Issue**: "Customer not found"
- ✅ Messages create customers automatically
- ✅ Check customers table for new entries
- ✅ Verify phone number format (+countrycode)

## 📋 Production Testing Checklist

Before going live:
- [ ] Webhook responds to verification
- [ ] Messages create customers automatically
- [ ] Menu categories display correctly
- [ ] Orders are created and stored
- [ ] Payment instructions are sent
- [ ] Restaurant dashboard shows orders
- [ ] Error handling works (invalid input)
- [ ] Conversation timeouts handled
- [ ] Rate limiting works properly