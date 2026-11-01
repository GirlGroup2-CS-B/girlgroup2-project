export type ItemType = "lost" | "found";

export type CampusItem = {
  id: string;
  type: ItemType;
  name: string;
  category: string;
  location: string;
  date: string;
  description: string;
  reporter: string;
  icon: string;
  status: "Open" | "Possible match" | "Returned";
  reviewStatus: "Pending" | "Approved" | "Rejected";
  image_path?: string;
};

export type NewItem = Omit<
  CampusItem,
  "id" | "reporter" | "status" | "reviewStatus"
>;

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:8000"
).replace(/\/$/, "");

const localItems: CampusItem[] = [
  {
    id: "item-1",
    type: "lost",
    name: "Navy blue backpack",
    category: "Bags",
    location: "Library, 2nd floor",
    date: "2026-10-25",
    description:
      "A navy backpack with a small yellow keychain. It may have been left near the study tables.",
    reporter: "Development sample",
    icon: "🎒",
    status: "Possible match",
    reviewStatus: "Approved",
  },
  {
    id: "item-2",
    type: "found",
    name: "Blue backpack",
    category: "Bags",
    location: "Main Library",
    date: "2026-10-26",
    description:
      "Found beside a study table on the second floor. A yellow keychain is attached.",
    reporter: "Development sample",
    icon: "🎒",
    status: "Possible match",
    reviewStatus: "Approved",
  },
  {
    id: "item-3",
    type: "lost",
    name: "Student ID card",
    category: "Documents",
    location: "Science Building",
    date: "2026-10-24",
    description:
      "Student ID in a clear sleeve. Please verify the name when claiming.",
    reporter: "Development sample",
    icon: "🪪",
    status: "Open",
    reviewStatus: "Approved",
  },
  {
    id: "item-4",
    type: "found",
    name: "Silver water bottle",
    category: "Accessories",
    location: "Student Center",
    date: "2026-10-26",
    description: "Reusable silver bottle found near the east entrance.",
    reporter: "Development sample",
    icon: "🧴",
    status: "Open",
    reviewStatus: "Approved",
  },
  {
    id: "item-5",
    type: "lost",
    name: "Wireless earbuds case",
    category: "Electronics",
    location: "Engineering Hall",
    date: "2026-10-22",
    description: "Small white charging case, no earbuds inside.",
    reporter: "Development sample",
    icon: "🎧",
    status: "Open",
    reviewStatus: "Approved",
  },
  {
    id: "item-6",
    type: "found",
    name: "Set of keys",
    category: "Personal items",
    location: "Campus Garden",
    date: "2026-10-21",
    description: "Three keys on a green fabric key ring.",
    reporter: "Development sample",
    icon: "🔑",
    status: "Open",
    reviewStatus: "Approved",
  },
];

export const itemRepository = {
  async list(): Promise<CampusItem[]> {
    try {
      const response = await fetch(`${API_URL}/api/items`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Fallback to local items if API is unreachable
    }
    return [...localItems];
  },

  async create(input: NewItem, reporter: string): Promise<CampusItem> {
    try {
      const response = await fetch(`${API_URL}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: input.type,
          name: input.name,
          category: input.category,
          location: input.location,
          date: input.date,
          description: input.description,
          icon: input.icon,
          reporter,
        }),
      });

      if (response.ok) {
        const savedItem = (await response.json()) as CampusItem;
        localItems.unshift(savedItem);
        return savedItem;
      }
    } catch {
      // Fallback to local memory creation if offline
    }

    const item: CampusItem = {
      ...input,
      id: `item-${Date.now()}`,
      reporter,
      status: "Open",
      reviewStatus: "Pending",
    };
    localItems.unshift(item);
    return item;
  },
};
