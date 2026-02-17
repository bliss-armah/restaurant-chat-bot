-- Enable Row-Level Security on all tables
ALTER TABLE "Restaurant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MenuItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Conversation" ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated admin users
-- These allow full access to authenticated users

CREATE POLICY "Admin full access on Restaurant"
  ON "Restaurant"
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Admin full access on User"
  ON "User"
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Admin full access on Customer"
  ON "Customer"
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Admin full access on MenuCategory"
  ON "MenuCategory"
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Admin full access on MenuItem"
  ON "MenuItem"
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Admin full access on Order"
  ON "Order"
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Admin full access on OrderItem"
  ON "OrderItem"
  FOR ALL
  TO authenticated
  USING (true);

CREATE POLICY "Admin full access on Conversation"
  ON "Conversation"
  FOR ALL
  TO authenticated
  USING (true);

-- Note: Service role key (used by Express backend) bypasses RLS automatically
-- So the backend can still access all data without being affected by these policies
