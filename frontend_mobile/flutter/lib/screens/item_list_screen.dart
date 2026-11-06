import 'package:flutter/material.dart';

import '../data/mock_item_repository.dart';
import '../models/campus_item.dart';

class ItemListScreen extends StatefulWidget {
  const ItemListScreen({
    required this.repository,
    required this.kind,
    super.key,
  });

  final MockItemRepository repository;
  final ItemKind kind;

  @override
  State<ItemListScreen> createState() => _ItemListScreenState();
}

class _ItemListScreenState extends State<ItemListScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _category = 'All categories';

  static const _categories = [
    'Bags',
    'Documents',
    'Electronics',
    'Clothing',
    'Accessories',
    'Personal items',
    'Other',
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isLost = widget.kind == ItemKind.lost;
    final query = _searchController.text.trim().toLowerCase();
    final items = widget.repository
        .byKind(widget.kind)
        .where((item) {
          final searchable =
              '${item.name} ${item.category} ${item.location} ${item.description}'
                  .toLowerCase();
          return searchable.contains(query) &&
              (_category == 'All categories' || item.category == _category);
        })
        .toList(growable: false);

    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 22, 18, 30),
      children: [
        Text(
          isLost ? 'LOST AND LOOKING' : 'FOUND ON CAMPUS',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 7),
        Text(
          isLost ? 'Lost items' : 'Found items',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 6),
        Text(
          isLost
              ? 'Browse reports and help someone find what they lost.'
              : 'See what has been found around your campus.',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: const Color(0xFF64748B),
            height: 1.5,
          ),
        ),
        const SizedBox(height: 18),
        TextField(
          controller: _searchController,
          onChanged: (_) => setState(() {}),
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(
            hintText: 'Search name or location',
            prefixIcon: const Icon(Icons.search),
            suffixIcon: _searchController.text.isEmpty
                ? null
                : IconButton(
                    tooltip: 'Clear search',
                    onPressed: () {
                      _searchController.clear();
                      setState(() {});
                    },
                    icon: const Icon(Icons.close),
                  ),
          ),
        ),
        const SizedBox(height: 10),
        DropdownButtonFormField<String>(
          initialValue: _category,
          decoration: const InputDecoration(
            labelText: 'Category',
            prefixIcon: Icon(Icons.filter_list),
          ),
          items: ['All categories', ..._categories]
              .map(
                (category) =>
                    DropdownMenuItem(value: category, child: Text(category)),
              )
              .toList(),
          onChanged: (value) =>
              setState(() => _category = value ?? 'All categories'),
        ),
        const SizedBox(height: 12),
        Text(
          '${items.length} ${items.length == 1 ? 'item' : 'items'}',
          style: Theme.of(
            context,
          ).textTheme.labelMedium?.copyWith(color: const Color(0xFF8390A3)),
        ),
        const SizedBox(height: 8),
        if (items.isEmpty)
          _EmptyItems(isLost: isLost)
        else
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 9),
              child: _ItemTile(item: item),
            ),
          ),
      ],
    );
  }
}

class _ItemTile extends StatelessWidget {
  const _ItemTile({required this.item});

  final CampusItem item;

  @override
  Widget build(BuildContext context) {
    final isLost = item.kind == ItemKind.lost;
    final accent = isLost ? const Color(0xFF2867A9) : const Color(0xFFA67800);

    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ItemDetailsScreen(item: item),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 58,
                height: 66,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: isLost
                      ? const Color(0xFFEAF2FF)
                      : const Color(0xFFFFF5D5),
                  borderRadius: BorderRadius.circular(11),
                ),
                child: Text(item.symbol, style: const TextStyle(fontSize: 28)),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      spacing: 6,
                      runSpacing: 4,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text(
                          isLost ? 'LOST ITEM' : 'FOUND ITEM',
                          style: TextStyle(
                            color: accent,
                            fontSize: 9,
                            fontWeight: FontWeight.w800,
                            letterSpacing: 0.6,
                          ),
                        ),
                        if (item.isPossibleMatch)
                          const _StatusChip(label: 'Possible match'),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      item.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(
                        context,
                      ).textTheme.titleMedium?.copyWith(fontSize: 13),
                    ),
                    const SizedBox(height: 5),
                    Text(
                      item.location,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF718198),
                        fontSize: 10,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      _formatDate(item.date),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF8A97A9),
                        fontSize: 9,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 3),
              const Icon(Icons.chevron_right, color: Color(0xFF94A0B1)),
            ],
          ),
        ),
      ),
    );
  }
}

class ItemDetailsScreen extends StatelessWidget {
  const ItemDetailsScreen({required this.item, super.key});

  final CampusItem item;

  @override
  Widget build(BuildContext context) {
    final isLost = item.kind == ItemKind.lost;
    return Scaffold(
      appBar: AppBar(title: const Text('Item details')),
      body: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          Container(
            height: 205,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(18),
              gradient: LinearGradient(
                colors: isLost
                    ? const [Color(0xFFEAF2FF), Color(0xFFCDDEFA)]
                    : const [Color(0xFFFFF5D5), Color(0xFFFFE9A0)],
              ),
            ),
            child: Container(
              width: 105,
              height: 105,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.7),
                borderRadius: BorderRadius.circular(30),
              ),
              child: Text(item.symbol, style: const TextStyle(fontSize: 52)),
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Text(
                isLost ? 'LOST ITEM' : 'FOUND ITEM',
                style: TextStyle(
                  color: isLost
                      ? const Color(0xFF2867A9)
                      : const Color(0xFFA67800),
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 0.7,
                ),
              ),
              if (item.isPossibleMatch) ...[
                const SizedBox(width: 8),
                const _StatusChip(label: 'Possible match'),
              ],
            ],
          ),
          const SizedBox(height: 7),
          Text(item.name, style: Theme.of(context).textTheme.headlineSmall),
          const SizedBox(height: 8),
          Text(
            item.description,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: const Color(0xFF64748B),
              height: 1.6,
            ),
          ),
          const SizedBox(height: 18),
          _DetailLine(label: 'Category', value: item.category),
          _DetailLine(
            label: isLost ? 'Last seen' : 'Found at',
            value: item.location,
          ),
          _DetailLine(label: 'Date', value: _formatDate(item.date)),
          _DetailLine(label: 'Reported by', value: item.reporter),
          const SizedBox(height: 14),
          FilledButton.icon(
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'Contact sharing will be available when the backend is connected.',
                ),
              ),
            ),
            icon: const Icon(Icons.volunteer_activism_outlined),
            label: const Text('I think this is mine'),
          ),
          const SizedBox(height: 9),
          Text(
            'Demo report details are temporary. Please verify ownership before arranging an item return.',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: const Color(0xFF8492A5),
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
    decoration: BoxDecoration(
      color: const Color(0xFFFFF5D7),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Text(
      label,
      style: const TextStyle(
        color: Color(0xFF946B00),
        fontSize: 9,
        fontWeight: FontWeight.w700,
      ),
    ),
  );
}

class _DetailLine extends StatelessWidget {
  const _DetailLine({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 105,
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: const Color(0xFF8492A5),
              fontSize: 11,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: const Color(0xFF33445B),
              fontSize: 11,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
      ],
    ),
  );
}

class _EmptyItems extends StatelessWidget {
  const _EmptyItems({required this.isLost});

  final bool isLost;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 45),
    child: Column(
      children: [
        const Icon(Icons.search_off, size: 37, color: Color(0xFF90A5BF)),
        const SizedBox(height: 10),
        Text(
          isLost ? 'No lost reports match' : 'No found reports match',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 5),
        Text(
          'Try another search or category.',
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: const Color(0xFF718198)),
        ),
      ],
    ),
  );
}

String _formatDate(DateTime date) {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return '${months[date.month - 1]} ${date.day}, ${date.year}';
}
