import { API_URL } from "../apiConfig";

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
> & {
  image?: File;
};

function toCampusItem(value: unknown): CampusItem | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const row = value as Record<string, unknown>;
  const type =
    row.report_type === "LOST"
      ? "lost"
      : row.report_type === "FOUND"
        ? "found"
        : null;

  if (
    type === null ||
    (typeof row.report_id !== "number" && typeof row.report_id !== "string") ||
    typeof row.item_name !== "string" ||
    typeof row.category !== "string" ||
    typeof row.location !== "string" ||
    typeof row.date_lost_or_found !== "string" ||
    typeof row.description !== "string" ||
    typeof row.listing_status !== "string"
  ) {
    return null;
  }

  const category =
    row.category === "Bags and Wallets"
      ? "Bags"
      : row.category === "Identification Cards"
        ? "Documents"
        : row.category === "Keys" || row.category === "School Supplies"
          ? "Personal items"
          : row.category;
  const reviewStatus =
    row.listing_status === "Pending Review"
      ? "Pending"
      : row.listing_status === "Withdrawn"
        ? "Rejected"
        : "Approved";

  return {
    id: String(row.report_id),
    type,
    name: row.item_name,
    category,
    location: row.location,
    date: row.date_lost_or_found,
    description: row.description,
    reporter: typeof row.reporter_name === "string" ? row.reporter_name : "",
    icon:
      category === "Bags"
        ? "🎒"
        : category === "Documents"
          ? "🪪"
          : category === "Electronics"
            ? "🎧"
            : category === "Accessories"
              ? "🧴"
              : "📦",
    status: row.listing_status === "Resolved" ? "Returned" : "Open",
    reviewStatus,
    ...(typeof row.image_path === "string" ? { image_path: row.image_path } : {}),
  };
}

async function readItems(url: string, token?: string): Promise<CampusItem[]> {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  const data: unknown = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : `Unable to load reports (${response.status}).`;
    throw new Error(message);
  }

  const rows =
    typeof data === "object" && data !== null && "items" in data
      ? data.items
      : data;
  if (!Array.isArray(rows)) {
    throw new Error("The server returned an invalid reports response.");
  }

  const items = rows
    .map(toCampusItem)
    .filter((item): item is CampusItem => item !== null);
  if (items.length !== rows.length) {
    throw new Error("The server returned a report with invalid data.");
  }
  return items;
}

export const itemRepository = {
  async list(): Promise<CampusItem[]> {
    return readItems(`${API_URL}/api/items`);
  },

  async listMine(token: string): Promise<CampusItem[]> {
    return readItems(`${API_URL}/api/items/mine`, token);
  },

  async create(input: NewItem, token: string): Promise<CampusItem> {
    const category =
      input.category === "Bags"
        ? "Bags and Wallets"
        : input.category === "Documents"
          ? "Identification Cards"
          : input.category === "Personal items"
            ? "Other"
            : input.category;
    const body = new FormData();
    body.append("item_name", input.name);
    body.append("category", category);
    body.append("location", input.location);
    body.append("date_lost_or_found", input.date);
    body.append("description", input.description);
    body.append("report_type", input.type.toUpperCase());
    if (input.image) {
      body.append("image", input.image);
    }

    const response = await fetch(`${API_URL}/api/items`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
    });
    const data: unknown = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
          ? data.error
          : `Unable to save report (${response.status}).`;
      throw new Error(message);
    }

    const savedItem =
      typeof data === "object" && data !== null && "item" in data
        ? toCampusItem(data.item)
        : null;
    if (!savedItem) {
      throw new Error("The server did not return the saved report.");
    }
    return savedItem;
  },
};
