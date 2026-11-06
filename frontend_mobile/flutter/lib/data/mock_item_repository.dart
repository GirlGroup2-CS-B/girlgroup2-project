import '../models/campus_item.dart';

class MockItemRepository {
  MockItemRepository() {
    final today = DateTime.now();
    _items = [
      CampusItem(
        id: 'item-1',
        kind: ItemKind.lost,
        name: 'Navy blue backpack',
        category: 'Bags',
        location: 'Library, 2nd floor',
        date: today.subtract(const Duration(days: 2)),
        description:
            'Navy backpack with a small yellow keychain, possibly left near the study tables.',
        reporter: 'alex.student@campusfind.demo',
        symbol: '🎒',
        isPossibleMatch: true,
      ),
      CampusItem(
        id: 'item-2',
        kind: ItemKind.found,
        name: 'Blue backpack',
        category: 'Bags',
        location: 'Main Library',
        date: today.subtract(const Duration(days: 1)),
        description:
            'Found beside a study table on the second floor. A yellow keychain is attached.',
        reporter: 'Campus community',
        symbol: '🎒',
        isPossibleMatch: true,
      ),
      CampusItem(
        id: 'item-3',
        kind: ItemKind.lost,
        name: 'Student ID card',
        category: 'Documents',
        location: 'Science Building',
        date: today.subtract(const Duration(days: 3)),
        description:
            'Student ID in a clear sleeve. Please verify the name when claiming.',
        reporter: 'jamie.student@campusfind.demo',
        symbol: '🪪',
      ),
      CampusItem(
        id: 'item-4',
        kind: ItemKind.found,
        name: 'Silver water bottle',
        category: 'Accessories',
        location: 'Student Center',
        date: today.subtract(const Duration(days: 1)),
        description: 'Reusable silver bottle found near the east entrance.',
        reporter: 'Campus community',
        symbol: '🧴',
      ),
      CampusItem(
        id: 'item-5',
        kind: ItemKind.lost,
        name: 'Wireless earbuds case',
        category: 'Electronics',
        location: 'Engineering Hall',
        date: today.subtract(const Duration(days: 4)),
        description: 'Small white charging case, no earbuds inside.',
        reporter: 'taylor.student@campusfind.demo',
        symbol: '🎧',
      ),
      CampusItem(
        id: 'item-6',
        kind: ItemKind.found,
        name: 'Set of keys',
        category: 'Personal items',
        location: 'Campus Garden',
        date: today.subtract(const Duration(days: 5)),
        description: 'Three keys on a green fabric key ring.',
        reporter: 'Campus community',
        symbol: '🔑',
      ),
    ];
  }

  late final List<CampusItem> _items;

  List<CampusItem> get items => List.unmodifiable(_items);

  List<CampusItem> byKind(ItemKind kind) =>
      _items.where((item) => item.kind == kind).toList(growable: false);

  List<CampusItem> get possibleMatches =>
      _items.where((item) => item.isPossibleMatch).toList(growable: false);

  void add(CampusItem item) {
    _items.insert(0, item);
  }
}
