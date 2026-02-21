// ============================================================
// CLIENT-SIDE: Update Supabase Auth Metadata
// Run this in your browser console while on the dashboard
// (Optional - your dashboard doesn't actually use this metadata)
// ============================================================

// Update the authenticated user's metadata
const { data, error } = await supabase.auth.updateUser({
  data: {
    role: 'SUPER_ADMIN',
    restaurantId: null  // Super admins aren't tied to specific restaurants
  }
});

if (error) {
  console.error('Failed to update user metadata:', error);
} else {
  console.log('✅ Updated user metadata:', data.user.user_metadata);
  console.log('🔄 Refresh the page to see changes');
}

// Check current metadata
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user metadata:', user?.user_metadata);