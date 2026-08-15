import bcrypt from "bcryptjs";
import { db, usersTable, companiesTable, buyersTable, recyclersTable, bidsTable, bidQuotesTable, tasksTable, activitiesTable, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const STAGES = [
  "New Lead", "Contacted", "Meeting Scheduled", "Site Inspection",
  "Quotation Sent", "Bid Open", "Negotiation", "Approved",
  "Pickup Scheduled", "Material Collected", "Completed", "Won", "Lost",
];

async function seed() {
  console.log("Seeding database...");

  // Create super admin
  const [existingAdmin] = await db.select().from(usersTable).where(eq(usersTable.email, "harshjain@recyclify.in"));
  let superAdmin;
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("Recyclify@2024", 12);
    [superAdmin] = await db.insert(usersTable).values({
      name: "Harsh Jain",
      email: "harshjain@recyclify.in",
      passwordHash,
      role: "super_admin",
      status: "active",
      department: "Management",
      isProtected: true,
    }).returning();
    console.log("Created super admin:", superAdmin.email);
  } else {
    superAdmin = existingAdmin;
    console.log("Super admin already exists:", superAdmin.email);
  }

  // Create sample team members
  const teamMembers = [
    { name: "Riya Sharma", email: "riya@recyclify.in", role: "manager", department: "Sales" },
    { name: "Arjun Verma", email: "arjun@recyclify.in", role: "manager", department: "Operations" },
    { name: "Sneha Patel", email: "sneha@recyclify.in", role: "team_member", department: "Sales" },
    { name: "Raj Kumar", email: "raj@recyclify.in", role: "team_member", department: "Logistics" },
    { name: "Priya Nair", email: "priya@recyclify.in", role: "admin", department: "Admin" },
  ];

  const createdUsers: (typeof usersTable.$inferSelect)[] = [superAdmin];
  for (const member of teamMembers) {
    const [ex] = await db.select().from(usersTable).where(eq(usersTable.email, member.email));
    if (!ex) {
      const passwordHash = await bcrypt.hash("Recyclify@2024", 12);
      const [u] = await db.insert(usersTable).values({ ...member, passwordHash, status: "active" }).returning();
      createdUsers.push(u);
      console.log("Created user:", u.email);
    } else {
      createdUsers.push(ex);
    }
  }

  // Create sample companies
  const companiesData = [
    { name: "Infosys Limited", industry: "IT Services", state: "Karnataka", city: "Bengaluru", stage: "Won", priority: "high", expectedRevenue: "450000", expectedScrapWeight: "12000", ownerId: superAdmin.id, assignedManagerId: createdUsers[1]?.id },
    { name: "Wipro Technologies", industry: "IT Services", state: "Karnataka", city: "Bengaluru", stage: "Negotiation", priority: "high", expectedRevenue: "320000", expectedScrapWeight: "8500", ownerId: superAdmin.id, assignedManagerId: createdUsers[2]?.id },
    { name: "HCL Technologies", industry: "IT Services", state: "Uttar Pradesh", city: "Noida", stage: "Bid Open", priority: "high", expectedRevenue: "280000", expectedScrapWeight: "7200", ownerId: createdUsers[1]?.id, assignedManagerId: createdUsers[1]?.id },
    { name: "Tech Mahindra", industry: "IT Services", state: "Maharashtra", city: "Pune", stage: "Site Inspection", priority: "medium", expectedRevenue: "195000", expectedScrapWeight: "5100", ownerId: createdUsers[1]?.id, assignedManagerId: createdUsers[2]?.id },
    { name: "Tata Consultancy Services", industry: "IT Services", state: "Maharashtra", city: "Mumbai", stage: "Contacted", priority: "high", expectedRevenue: "520000", expectedScrapWeight: "14000", ownerId: superAdmin.id, assignedManagerId: createdUsers[1]?.id },
    { name: "Mphasis Ltd", industry: "IT Services", state: "Karnataka", city: "Bengaluru", stage: "Quotation Sent", priority: "medium", expectedRevenue: "175000", expectedScrapWeight: "4800", ownerId: createdUsers[2]?.id, assignedManagerId: createdUsers[2]?.id },
    { name: "Hexaware Technologies", industry: "BPO", state: "Maharashtra", city: "Navi Mumbai", stage: "Meeting Scheduled", priority: "medium", expectedRevenue: "125000", expectedScrapWeight: "3400", ownerId: createdUsers[3]?.id, assignedManagerId: createdUsers[1]?.id },
    { name: "L&T Technology Services", industry: "Engineering", state: "Gujarat", city: "Vadodara", stage: "New Lead", priority: "low", expectedRevenue: "88000", expectedScrapWeight: "2300", ownerId: createdUsers[3]?.id, assignedManagerId: createdUsers[2]?.id },
    { name: "Cognizant Technology", industry: "IT Services", state: "Tamil Nadu", city: "Chennai", stage: "Approved", priority: "high", expectedRevenue: "380000", expectedScrapWeight: "10200", ownerId: createdUsers[1]?.id, assignedManagerId: createdUsers[1]?.id },
    { name: "Zensar Technologies", industry: "IT Services", state: "Maharashtra", city: "Pune", stage: "Pickup Scheduled", priority: "medium", expectedRevenue: "145000", expectedScrapWeight: "3900", ownerId: createdUsers[2]?.id, assignedManagerId: createdUsers[2]?.id },
    { name: "NIIT Technologies", industry: "IT Services", state: "Delhi", city: "New Delhi", stage: "Material Collected", priority: "medium", expectedRevenue: "112000", expectedScrapWeight: "3100", ownerId: createdUsers[3]?.id, assignedManagerId: createdUsers[1]?.id },
    { name: "Persistent Systems", industry: "Software", state: "Maharashtra", city: "Pune", stage: "Completed", priority: "high", expectedRevenue: "225000", expectedScrapWeight: "6000", ownerId: createdUsers[1]?.id, assignedManagerId: createdUsers[2]?.id },
    { name: "Mindtree Ltd", industry: "IT Services", state: "Karnataka", city: "Bengaluru", stage: "Lost", priority: "low", expectedRevenue: "95000", expectedScrapWeight: "2600", ownerId: createdUsers[2]?.id, assignedManagerId: createdUsers[2]?.id },
    { name: "Oracle Financial Services", industry: "BFSI", state: "Maharashtra", city: "Mumbai", stage: "New Lead", priority: "high", expectedRevenue: "480000", expectedScrapWeight: "13000", ownerId: superAdmin.id, assignedManagerId: createdUsers[1]?.id },
    { name: "Accenture India", industry: "IT Services", state: "Maharashtra", city: "Mumbai", stage: "Contacted", priority: "high", expectedRevenue: "560000", expectedScrapWeight: "15200", ownerId: superAdmin.id, assignedManagerId: createdUsers[2]?.id },
  ];

  const createdCompanies: (typeof companiesTable.$inferSelect)[] = [];
  for (const co of companiesData) {
    const [c] = await db.insert(companiesTable).values({ ...co, status: "active" }).returning();
    createdCompanies.push(c);
    console.log("Created company:", c.name);
  }

  // Create buyers
  const buyersData = [
    { name: "Ramesh Gupta", company: "RecyclePro Traders", phone: "9876543210", email: "ramesh@recyclepro.in", state: "Maharashtra", city: "Mumbai", materialCategories: ["CPU", "RAM", "HDD", "SSD"], maxBid: "850000", pickupStates: ["Maharashtra", "Gujarat", "Goa"], paymentTerms: "Net 15", rating: "4.5", totalBids: 28, wonBids: 12 },
    { name: "Anil Mehta", company: "GreenTech Recyclers", phone: "9876543211", email: "anil@greentech.in", state: "Karnataka", city: "Bengaluru", materialCategories: ["Laptop", "Desktop", "Server", "Monitor"], maxBid: "720000", pickupStates: ["Karnataka", "Tamil Nadu", "Kerala", "Telangana"], paymentTerms: "Immediate", rating: "4.8", totalBids: 45, wonBids: 22 },
    { name: "Suresh Jain", company: "EcoCircle Pvt Ltd", phone: "9876543212", email: "suresh@ecocircle.in", state: "Gujarat", city: "Ahmedabad", materialCategories: ["Battery", "PCB", "Networking"], maxBid: "560000", pickupStates: ["Gujarat", "Rajasthan", "Maharashtra"], paymentTerms: "Net 30", rating: "3.9", totalBids: 18, wonBids: 6 },
    { name: "Pradeep Singh", company: "E-Waste Hub", phone: "9876543213", email: "pradeep@ewastehub.in", state: "Delhi", city: "New Delhi", materialCategories: ["CPU", "Laptop", "Desktop", "Printer", "Monitor", "Others"], maxBid: "950000", pickupStates: ["Delhi", "Haryana", "Uttar Pradesh", "Punjab"], paymentTerms: "Net 7", rating: "4.2", totalBids: 62, wonBids: 31 },
    { name: "Vijay Kumar", company: "BestScrap Solutions", phone: "9876543214", email: "vijay@bestscrap.in", state: "Tamil Nadu", city: "Chennai", materialCategories: ["Server", "Networking", "RAM", "SSD", "HDD"], maxBid: "640000", pickupStates: ["Tamil Nadu", "Karnataka", "Andhra Pradesh"], paymentTerms: "Net 15", rating: "4.6", totalBids: 37, wonBids: 18 },
    { name: "Kapil Sharma", company: "MetalMind Traders", phone: "9876543215", email: "kapil@metalmind.in", state: "Telangana", city: "Hyderabad", materialCategories: ["PCB", "Battery", "Others"], maxBid: "420000", pickupStates: ["Telangana", "Andhra Pradesh", "Karnataka"], paymentTerms: "Immediate", rating: "3.7", totalBids: 14, wonBids: 4 },
  ];

  const createdBuyers: (typeof buyersTable.$inferSelect)[] = [];
  for (const b of buyersData) {
    const [buyer] = await db.insert(buyersTable).values({
      ...b, maxBid: b.maxBid, rating: b.rating, status: "active",
    }).returning();
    createdBuyers.push(buyer);
    console.log("Created buyer:", buyer.name);
  }

  // Create recyclers
  const recyclersData = [
    { name: "CleanEarth Recyclers Pvt Ltd", company: "CleanEarth", phone: "9988776655", email: "info@cleanearth.in", gst: "27AABCC1234A1Z5", cpcbAuth: "CPCB/AUTH/2023/001", state: "Maharashtra", city: "Thane", materialCategories: ["CPU", "Laptop", "Desktop", "Server", "RAM", "HDD", "SSD", "Monitor"], capacity: "50 MT/month", pickupArea: "Pan India", paymentTerms: "Net 30" },
    { name: "GreenPath E-Waste Pvt Ltd", company: "GreenPath", phone: "9988776644", email: "ops@greenpath.in", gst: "29AABCC5678B1Z8", cpcbAuth: "CPCB/AUTH/2023/042", spcbAuth: "KSPCB/2023/187", state: "Karnataka", city: "Bengaluru", materialCategories: ["Battery", "PCB", "Networking", "Printer", "Others"], capacity: "30 MT/month", pickupArea: "South India", paymentTerms: "Immediate" },
    { name: "SafeDispose Technologies", company: "SafeDispose", phone: "9988776633", email: "contact@safedispose.in", gst: "07AABCC9012C1Z3", cpcbAuth: "CPCB/AUTH/2022/089", state: "Delhi", city: "New Delhi", materialCategories: ["CPU", "RAM", "HDD", "SSD", "Monitor", "Others"], capacity: "75 MT/month", pickupArea: "North India", paymentTerms: "Net 15" },
  ];

  for (const r of recyclersData) {
    await db.insert(recyclersTable).values({ ...r, status: "active" }).returning();
    console.log("Created recycler:", r.name);
  }

  // Create bids for companies in bid-open/negotiation stages
  const bidCompanies = createdCompanies.filter(c => ["Bid Open", "Negotiation", "Approved", "Won"].includes(c.stage));
  const createdBids: (typeof bidsTable.$inferSelect)[] = [];
  for (const co of bidCompanies.slice(0, 5)) {
    const [bid] = await db.insert(bidsTable).values({
      title: `Bid - ${co.name} IT Assets`,
      companyId: co.id,
      status: co.stage === "Won" ? "awarded" : co.stage === "Negotiation" ? "negotiation" : "open",
      description: `IT asset disposal bid for ${co.name}`,
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      winningBuyerId: co.stage === "Won" ? createdBuyers[0]?.id : null,
      winningAmount: co.stage === "Won" ? String(Number(co.expectedRevenue) * 0.85) : null,
      createdById: superAdmin.id,
    }).returning();
    createdBids.push(bid);

    // Add some quotes
    for (const buyer of createdBuyers.slice(0, 3)) {
      const baseAmount = Number(co.expectedRevenue) * (0.70 + Math.random() * 0.25);
      await db.insert(bidQuotesTable).values({
        bidId: bid.id, buyerId: buyer.id,
        amount: String(Math.round(baseAmount)),
        status: (co.stage === "Won" && buyer.id === createdBuyers[0]?.id) ? "accepted" : "pending",
      });
    }
    console.log("Created bid for:", co.name);
  }

  // Create sample tasks
  const tasksData = [
    { title: "Follow up with Wipro Technologies", description: "Schedule call for bid presentation", priority: "high", status: "todo", assignedToId: createdUsers[1]?.id, entityType: "company", entityId: createdCompanies[1]?.id, dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { title: "Site inspection at HCL Noida", description: "Conduct IT asset inspection at HCL Noida facility", priority: "high", status: "in_progress", assignedToId: createdUsers[2]?.id, entityType: "company", entityId: createdCompanies[2]?.id, dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { title: "Prepare quotation for Tech Mahindra", description: "Finalize rates and prepare formal quotation", priority: "medium", status: "todo", assignedToId: createdUsers[1]?.id, entityType: "company", entityId: createdCompanies[3]?.id, dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { title: "Collect payment from Infosys", description: "Follow up on pending payment for completed pickup", priority: "high", status: "todo", assignedToId: superAdmin.id, entityType: "company", entityId: createdCompanies[0]?.id, dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { title: "Update buyer database with new contacts", description: "Add 3 new buyers from recent trade expo", priority: "low", status: "todo", assignedToId: createdUsers[3]?.id, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { title: "TCS initial meeting arranged", description: "Scheduled initial meeting with TCS procurement team", priority: "high", status: "in_progress", assignedToId: createdUsers[1]?.id, entityType: "company", entityId: createdCompanies[4]?.id, dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
    { title: "Verify CPCB certificates for CleanEarth", description: "Cross-check all authorization certificates", priority: "medium", status: "done", assignedToId: createdUsers[4]?.id, dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] },
  ];

  for (const t of tasksData) {
    await db.insert(tasksTable).values({ ...t, createdById: superAdmin.id } as any);
    console.log("Created task:", t.title);
  }

  // Create sample activities
  const now = new Date();
  const activitiesData = [
    { type: "company_created", description: "Infosys Limited added as a lead", entityType: "company", entityId: createdCompanies[0]?.id, entityName: "Infosys Limited", userId: superAdmin.id, createdAt: new Date(now.getTime() - 86400000 * 7) },
    { type: "stage_changed", description: "Wipro Technologies moved to Negotiation stage", entityType: "company", entityId: createdCompanies[1]?.id, entityName: "Wipro Technologies", userId: createdUsers[1]?.id, createdAt: new Date(now.getTime() - 86400000 * 5) },
    { type: "bid_created", description: "Bid created for HCL Technologies IT assets", entityType: "bid", entityId: createdBids[0]?.id, entityName: "HCL Technologies", userId: superAdmin.id, createdAt: new Date(now.getTime() - 86400000 * 4) },
    { type: "buyer_added", description: "New buyer Pradeep Singh from E-Waste Hub added", entityType: "buyer", entityId: createdBuyers[3]?.id, entityName: "Pradeep Singh", userId: createdUsers[1]?.id, createdAt: new Date(now.getTime() - 86400000 * 3) },
    { type: "stage_changed", description: "HCL Technologies moved to Bid Open stage", entityType: "company", entityId: createdCompanies[2]?.id, entityName: "HCL Technologies", userId: createdUsers[1]?.id, createdAt: new Date(now.getTime() - 86400000 * 2) },
    { type: "company_updated", description: "Tech Mahindra site inspection scheduled", entityType: "company", entityId: createdCompanies[3]?.id, entityName: "Tech Mahindra", userId: createdUsers[2]?.id, createdAt: new Date(now.getTime() - 86400000 * 1) },
    { type: "user_login", description: "Harsh Jain logged in", entityType: "user", entityId: superAdmin.id, entityName: "Harsh Jain", userId: superAdmin.id, createdAt: new Date(now.getTime() - 3600000 * 2) },
    { type: "company_created", description: "Accenture India added as a new lead", entityType: "company", entityId: createdCompanies[14]?.id, entityName: "Accenture India", userId: superAdmin.id, createdAt: new Date(now.getTime() - 3600000 * 1) },
  ];

  for (const a of activitiesData) {
    await db.insert(activitiesTable).values(a as any);
  }
  console.log("Created activities");

  // Initialize app settings
  const [existingSettings] = await db.select().from(appSettingsTable);
  if (!existingSettings) {
    await db.insert(appSettingsTable).values({
      appName: "Recyclify Bidder Market",
      primaryColor: "#118847",
      timezone: "Asia/Kolkata",
      currency: "INR",
      emailNotifications: "true",
    });
    console.log("Created app settings");
  }

  console.log("\nSeed complete!");
  console.log("Super admin login: harshjain@recyclify.in / Recyclify@2024");
  console.log("Other users login: <email> / Recyclify@2024");
}

seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
