enum ItemKind { lost, found }

class CampusItem {
  const CampusItem({
    required this.id,
    required this.kind,
    required this.name,
    required this.category,
    required this.location,
    required this.date,
    required this.description,
    required this.reporter,
    required this.symbol,
    this.isPossibleMatch = false,
  });

  final String id;
  final ItemKind kind;
  final String name;
  final String category;
  final String location;
  final DateTime date;
  final String description;
  final String reporter;
  final String symbol;
  final bool isPossibleMatch;
}
