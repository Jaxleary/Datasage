import fs from "node:fs/promises";
import path from "node:path";

const products = [
  { category: "Software", product: "Workflow Pro", price: 199, cost: 44, returnRate: 0.025, satisfaction: 4.7 },
  { category: "Services", product: "Onboarding Bundle", price: 900, cost: 420, returnRate: 0.012, satisfaction: 4.8 },
  { category: "Hardware", product: "Smart Display", price: 430, cost: 258, returnRate: 0.085, satisfaction: 4.2 },
  { category: "Accessories", product: "Docking Station", price: 145, cost: 78, returnRate: 0.065, satisfaction: 4.3 },
  { category: "Software", product: "Insight Analytics", price: 349, cost: 72, returnRate: 0.018, satisfaction: 4.6 },
  { category: "Services", product: "Premium Support", price: 650, cost: 250, returnRate: 0.01, satisfaction: 4.9 },
];

const regions = [
  { region: "West", city: "Los Angeles", factor: 1.18 },
  { region: "East", city: "New York", factor: 1.09 },
  { region: "South", city: "Austin", factor: 0.93 },
  { region: "Midwest", city: "Chicago", factor: 0.88 },
];

const channels = ["Online", "Retail Store", "Partner"];
const campaigns = ["Always-On Search", "Spring Bundle", "Email Nurture", "Partner Webinar"];
const header = [
  "Order Date", "Order ID", "Region", "City", "Sales Channel", "Campaign", "Product Category", "Product",
  "Units Sold", "Discount Percent", "Revenue", "Marketing Spend", "Gross Profit", "Customer Satisfaction", "Returned",
];

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function round(value) {
  return Math.round(value * 100) / 100;
}

const start = new Date("2026-01-05T00:00:00");
const rows = [];
for (let week = 0; week < 24; week += 1) {
  for (let slot = 0; slot < 6; slot += 1) {
    const product = products[(week + slot) % products.length];
    const region = regions[(week * 2 + slot) % regions.length];
    const channel = channels[(week + slot * 2) % channels.length];
    const campaign = campaigns[(week + slot) % campaigns.length];
    const date = new Date(start);
    date.setDate(start.getDate() + week * 7 + slot);

    const seasonality = week >= 13 && week <= 19 ? 1.22 : week >= 20 ? 1.08 : 1;
    const channelFactor = channel === "Online" ? 1.16 : channel === "Partner" ? 0.88 : 1;
    const baseUnits = product.category === "Software" ? 22 : product.category === "Services" ? 7 : product.category === "Hardware" ? 12 : 18;
    const units = Math.max(2, Math.round(baseUnits * region.factor * seasonality * channelFactor + ((week * 3 + slot * 5) % 9) - 4));
    const discount = product.category === "Hardware" ? 0.12 + (slot % 3) * 0.03 : product.category === "Accessories" ? 0.08 + (week % 2) * 0.04 : (slot % 3) * 0.025;
    const revenue = round(units * product.price * (1 - discount));
    const marketingSpend = round((campaign === "Spring Bundle" ? 260 : campaign === "Partner Webinar" ? 190 : campaign === "Always-On Search" ? 145 : 75) * region.factor * (channel === "Online" ? 1.15 : 1));
    const grossProfit = round(revenue - units * product.cost - marketingSpend);
    const returned = ((week * 7 + slot * 11) % 100) < product.returnRate * 100 ? "Yes" : "No";
    const satisfaction = (week * 6 + slot) % 17 === 0 ? "" : round(Math.max(3.6, product.satisfaction - (returned === "Yes" ? 0.7 : 0) + ((week + slot) % 3 - 1) * 0.1));

    rows.push([
      date.toISOString().slice(0, 10),
      `DS-${String(1001 + rows.length).padStart(4, "0")}`,
      region.region,
      region.city,
      channel,
      campaign,
      product.category,
      product.product,
      units,
      discount.toFixed(2),
      revenue.toFixed(2),
      marketingSpend.toFixed(2),
      grossProfit.toFixed(2),
      satisfaction,
      returned,
    ]);
  }
}

const output = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
const outputPath = path.resolve("public/datasage-retail-demo.csv");
await fs.writeFile(outputPath, output, "utf8");
console.log(`Created ${outputPath} with ${rows.length} rows.`);
