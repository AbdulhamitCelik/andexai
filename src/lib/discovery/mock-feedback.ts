import { v4 as uuid } from "uuid";
import type { FeedbackItem } from "@/lib/types";

/** Demo feedback corpus — simulates app reviews, support tickets, and surveys */
export function getMockFeedback(projectId?: string): FeedbackItem[] {
  const ts = (daysAgo: number) =>
    new Date(Date.now() - daysAgo * 86400000).toISOString();

  const items: Omit<FeedbackItem, "id">[] = [
    // UK checkout cluster
    { source: "app_review", text: "App is slow in London — checkout took 45 seconds", geo: "London, UK", sentiment: "negative", timestamp: ts(2), userSegment: "mobile_shopper" },
    { source: "support_ticket", text: "Checkout takes too long, customers abandoning cart", geo: "UK", sentiment: "negative", timestamp: ts(3), userSegment: "support_agent" },
    { source: "app_review", text: "Payment page freezes on iPhone when I tap Pay", geo: "Manchester, UK", sentiment: "negative", timestamp: ts(4), userSegment: "mobile_shopper" },
    { source: "survey", text: "Users in UK complain about Apple Pay missing — we need local payment options", geo: "UK", sentiment: "negative", timestamp: ts(5), userSegment: "product_manager" },
    { source: "app_review", text: "Why no Apple Pay? Every other app has it", geo: "London, UK", sentiment: "negative", timestamp: ts(1), userSegment: "premium_user" },
    { source: "support_ticket", text: "Slow checkout latency reported by 12 users this week in London area", geo: "London, UK", sentiment: "negative", timestamp: ts(6), userSegment: "support_agent" },
    { source: "social", text: "Checkout on this app is painfully slow compared to competitors", geo: "Birmingham, UK", sentiment: "negative", timestamp: ts(7), userSegment: "social_listener" },
    { source: "app_review", text: "Payment failed twice before going through — very frustrating", geo: "Edinburgh, UK", sentiment: "negative", timestamp: ts(8), userSegment: "mobile_shopper" },
    { source: "analytics", text: "42% drop-off at payment step for UK users vs 18% EU average", geo: "UK", sentiment: "negative", timestamp: ts(2), userSegment: "data_analyst" },
    { source: "interview", text: "London users expect Apple Pay and Google Pay at minimum", geo: "London, UK", sentiment: "neutral", timestamp: ts(10), userSegment: "ux_researcher" },

    // Search & discovery cluster
    { source: "app_review", text: "Can't find products easily — search returns irrelevant results", geo: "US", sentiment: "negative", timestamp: ts(3), userSegment: "mobile_shopper" },
    { source: "support_ticket", text: "Filters don't work on category pages", geo: "US", sentiment: "negative", timestamp: ts(5), userSegment: "support_agent" },
    { source: "survey", text: "Product discovery is the #1 complaint in our NPS survey", geo: "Global", sentiment: "negative", timestamp: ts(4), userSegment: "product_manager" },
    { source: "app_review", text: "Search bar is hidden and autocomplete is broken", geo: "Canada", sentiment: "negative", timestamp: ts(6), userSegment: "mobile_shopper" },
    { source: "analytics", text: "Only 12% of sessions use search — industry benchmark is 30%", geo: "Global", sentiment: "neutral", timestamp: ts(1), userSegment: "data_analyst" },
    { source: "interview", text: "Users want visual search and better filters by price/rating", geo: "US", sentiment: "neutral", timestamp: ts(9), userSegment: "ux_researcher" },

    // Notifications cluster
    { source: "app_review", text: "Too many push notifications — I turned them all off", geo: "US", sentiment: "negative", timestamp: ts(2), userSegment: "mobile_shopper" },
    { source: "support_ticket", text: "Order status notifications arrive hours late", geo: "UK", sentiment: "negative", timestamp: ts(4), userSegment: "support_agent" },
    { source: "survey", text: "Users want smart notifications — only for deals they care about", geo: "Global", sentiment: "neutral", timestamp: ts(7), userSegment: "product_manager" },
    { source: "app_review", text: "Missed a flash sale because notification was buried", geo: "Germany", sentiment: "negative", timestamp: ts(3), userSegment: "premium_user" },
    { source: "social", text: "Notification spam is killing engagement on this app", geo: "Global", sentiment: "negative", timestamp: ts(5), userSegment: "social_listener" },

    // Onboarding cluster
    { source: "app_review", text: "Signup flow is too long — 6 screens before I can browse", geo: "US", sentiment: "negative", timestamp: ts(1), userSegment: "new_user" },
    { source: "analytics", text: "68% drop-off during onboarding step 3 (email verification)", geo: "Global", sentiment: "negative", timestamp: ts(2), userSegment: "data_analyst" },
    { source: "interview", text: "New users don't understand loyalty points during signup", geo: "UK", sentiment: "neutral", timestamp: ts(8), userSegment: "ux_researcher" },
    { source: "support_ticket", text: "Password reset emails not arriving — blocks new signups", geo: "US", sentiment: "negative", timestamp: ts(4), userSegment: "support_agent" },

    // Accessibility cluster
    { source: "app_review", text: "Text too small and no dark mode — hard to use at night", geo: "US", sentiment: "negative", timestamp: ts(3), userSegment: "accessibility_user" },
    { source: "survey", text: "Dark mode is the most requested feature in Q1 survey (847 votes)", geo: "Global", sentiment: "neutral", timestamp: ts(6), userSegment: "product_manager" },
    { source: "support_ticket", text: "Screen reader can't read product prices correctly", geo: "UK", sentiment: "negative", timestamp: ts(5), userSegment: "support_agent" },
    { source: "app_review", text: "Please add dark mode — my eyes hurt using this at night", geo: "Canada", sentiment: "negative", timestamp: ts(2), userSegment: "accessibility_user" },
  ];

  return items.map((item) => ({
    ...item,
    id: uuid(),
    projectId,
  }));
}
