import 'package:flutter/material.dart';

import '../data/mock_item_repository.dart';
import '../models/campus_item.dart';
import 'item_list_screen.dart';
import 'report_item_screen.dart';

class CampusShell extends StatefulWidget {
  const CampusShell({
    required this.email,
    required this.repository,
    required this.onSignOut,
    super.key,
  });

  final String email;
  final MockItemRepository repository;
  final VoidCallback onSignOut;

  @override
  State<CampusShell> createState() => _CampusShellState();
}

class _CampusShellState extends State<CampusShell> {
  int _selectedIndex = 0;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final pages = [
      _DashboardScreen(
        repository: widget.repository,
        onSelectPage: (index) => setState(() => _selectedIndex = index),
      ),
      ItemListScreen(repository: widget.repository, kind: ItemKind.lost),
      ItemListScreen(repository: widget.repository, kind: ItemKind.found),
      _MatchAlertsScreen(repository: widget.repository),
      _ProfileScreen(email: widget.email, onSignOut: widget.onSignOut),
    ];

    return Scaffold(
      appBar: AppBar(
        leadingWidth: 48,
        leading: Padding(
          padding: const EdgeInsets.only(left: 14),
          child: Center(
            child: Container(
              width: 35,
              height: 35,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: theme.colorScheme.primary,
                borderRadius: BorderRadius.circular(11),
              ),
              child: const Text(
                'CF',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
          ),
        ),
        title: Text.rich(
          TextSpan(
            text: 'Campus',
            style: theme.textTheme.titleMedium?.copyWith(fontSize: 17),
            children: [
              TextSpan(
                text: 'Find',
                style: TextStyle(color: theme.colorScheme.primary),
              ),
            ],
          ),
        ),
        actions: [
          IconButton(
            tooltip: 'Match alerts',
            onPressed: () => setState(() => _selectedIndex = 3),
            icon: const Icon(Icons.notifications_none_outlined),
          ),
          const Padding(
            padding: EdgeInsets.only(right: 15),
            child: Icon(
              Icons.location_on_outlined,
              color: Color(0xFF8492A5),
              size: 19,
            ),
          ),
        ],
      ),
      body: IndexedStack(index: _selectedIndex, children: pages),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _chooseReportType,
        icon: const Icon(Icons.add),
        label: const Text('Report'),
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (index) =>
            setState(() => _selectedIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Home',
          ),
          NavigationDestination(icon: Icon(Icons.search), label: 'Lost'),
          NavigationDestination(
            icon: Icon(Icons.inventory_2_outlined),
            label: 'Found',
          ),
          NavigationDestination(
            icon: Icon(Icons.auto_awesome_outlined),
            label: 'Matches',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_circle_outlined),
            label: 'Account',
          ),
        ],
      ),
    );
  }

  Future<void> _chooseReportType() async {
    final kind = await showModalBottomSheet<ItemKind>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 2, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'What would you like to report?',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 7),
              Text(
                'Choose the report that best describes your item.',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: const Color(0xFF718198)),
              ),
              const SizedBox(height: 15),
              OutlinedButton.icon(
                onPressed: () => Navigator.pop(context, ItemKind.lost),
                icon: const Icon(Icons.search),
                label: const Text('I lost an item'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
              ),
              const SizedBox(height: 9),
              OutlinedButton.icon(
                onPressed: () => Navigator.pop(context, ItemKind.found),
                icon: const Icon(Icons.volunteer_activism_outlined),
                label: const Text('I found an item'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    if (kind == null || !mounted) return;

    final item = await Navigator.of(context).push<CampusItem>(
      MaterialPageRoute(
        builder: (_) => ReportItemScreen(
          repository: widget.repository,
          kind: kind,
          reporter: widget.email,
        ),
      ),
    );
    if (item != null && mounted) {
      setState(() {
        _selectedIndex = item.kind == ItemKind.lost ? 1 : 2;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Report added to this temporary demo session.'),
        ),
      );
    }
  }
}

class _DashboardScreen extends StatelessWidget {
  const _DashboardScreen({
    required this.repository,
    required this.onSelectPage,
  });

  final MockItemRepository repository;
  final ValueChanged<int> onSelectPage;

  @override
  Widget build(BuildContext context) {
    final items = repository.items;
    final matches = repository.possibleMatches.length;
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 19, 18, 90),
      children: [
        Text(
          'JRMSU MAIN CAMPUS',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: const Color(0xFF8290A4),
            fontWeight: FontWeight.w800,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Your campus, connected',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(21),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(18),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF174A8B), Color(0xFF17165C)],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: Colors.white.withValues(alpha: 0.2),
                  ),
                ),
                child: const Text(
                  'A MORE CONNECTED CAMPUS',
                  style: TextStyle(
                    color: Color(0xFFFFE898),
                    fontSize: 8,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.7,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              const Text(
                'Find what matters.\nReturn what belongs.',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.w800,
                  height: 1.14,
                  letterSpacing: -0.8,
                ),
              ),
              const SizedBox(height: 9),
              Text(
                'Help a lost belonging find its way back to its owner.',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: 0.82),
                  fontSize: 11,
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  FilledButton(
                    onPressed: () => onSelectPage(1),
                    style: FilledButton.styleFrom(
                      backgroundColor: const Color(0xFFFFC928),
                      foregroundColor: const Color(0xFF20264D),
                      minimumSize: const Size(125, 40),
                    ),
                    child: const Text('Find an item'),
                  ),
                  OutlinedButton(
                    onPressed: () => onSelectPage(2),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white,
                      side: BorderSide(
                        color: Colors.white.withValues(alpha: 0.4),
                      ),
                      minimumSize: const Size(125, 40),
                    ),
                    child: const Text('Browse found'),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(height: 13),
        Row(
          children: [
            Expanded(
              child: _OverviewCard(
                icon: Icons.search,
                label: 'Active reports',
                value: '${items.length}',
                color: const Color(0xFFEAF2FF),
                foreground: const Color(0xFF2867A9),
              ),
            ),
            const SizedBox(width: 9),
            Expanded(
              child: _OverviewCard(
                icon: Icons.auto_awesome,
                label: 'Possible matches',
                value: '$matches',
                color: const Color(0xFFFFF5D5),
                foreground: const Color(0xFFA67800),
              ),
            ),
          ],
        ),
        const SizedBox(height: 23),
        Row(
          children: [
            Expanded(
              child: Text(
                'Recently reported',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontSize: 17),
              ),
            ),
            TextButton(
              onPressed: () => onSelectPage(1),
              child: const Text('View all'),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...items
            .take(3)
            .map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 9),
                child: _DashboardItemCard(item: item),
              ),
            ),
        const SizedBox(height: 4),
        const _DemoNotice(),
      ],
    );
  }
}

class _OverviewCard extends StatelessWidget {
  const _OverviewCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
    required this.foreground,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final Color foreground;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 12),
      child: Row(
        children: [
          Container(
            width: 35,
            height: 35,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 19, color: foreground),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  maxLines: 2,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: const Color(0xFF718198),
                    fontSize: 9,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: Theme.of(
                    context,
                  ).textTheme.titleMedium?.copyWith(fontSize: 15),
                ),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _DashboardItemCard extends StatelessWidget {
  const _DashboardItemCard({required this.item});

  final CampusItem item;

  @override
  Widget build(BuildContext context) {
    final isLost = item.kind == ItemKind.lost;
    return Card(
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 11, vertical: 3),
        leading: Container(
          width: 46,
          height: 48,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: isLost ? const Color(0xFFEAF2FF) : const Color(0xFFFFF5D5),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Text(item.symbol, style: const TextStyle(fontSize: 23)),
        ),
        title: Text(
          item.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: Theme.of(
            context,
          ).textTheme.titleMedium?.copyWith(fontSize: 12),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text(
            '${isLost ? 'Lost' : 'Found'} · ${item.location}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: const Color(0xFF718198),
              fontSize: 10,
            ),
          ),
        ),
        trailing: const Icon(Icons.chevron_right, color: Color(0xFF94A0B1)),
        onTap: () => Navigator.of(context).push(
          MaterialPageRoute<void>(
            builder: (_) => ItemDetailsScreen(item: item),
          ),
        ),
      ),
    );
  }
}

class _MatchAlertsScreen extends StatelessWidget {
  const _MatchAlertsScreen({required this.repository});

  final MockItemRepository repository;

  @override
  Widget build(BuildContext context) {
    final matches = repository.possibleMatches;
    return ListView(
      padding: const EdgeInsets.fromLTRB(18, 22, 18, 30),
      children: [
        Text(
          'A HELPING HAND',
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: Theme.of(context).colorScheme.primary,
            fontWeight: FontWeight.w800,
            letterSpacing: 1.1,
          ),
        ),
        const SizedBox(height: 7),
        Text(
          'Possible matches',
          style: Theme.of(context).textTheme.headlineSmall,
        ),
        const SizedBox(height: 7),
        Text(
          'Review related reports that may describe the same item.',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: const Color(0xFF64748B),
            height: 1.5,
          ),
        ),
        const SizedBox(height: 15),
        const _DemoNotice(
          message:
              'These are sample suggestions. Image-based matching is not connected yet.',
        ),
        const SizedBox(height: 13),
        if (matches.isEmpty)
          const _EmptyMatches()
        else
          ...matches.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 9),
              child: _DashboardItemCard(item: item),
            ),
          ),
      ],
    );
  }
}

class _EmptyMatches extends StatelessWidget {
  const _EmptyMatches();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 55),
    child: Column(
      children: [
        const Icon(
          Icons.auto_awesome_outlined,
          size: 37,
          color: Color(0xFF90A5BF),
        ),
        const SizedBox(height: 10),
        Text(
          'No possible matches right now',
          style: Theme.of(context).textTheme.titleMedium,
        ),
      ],
    ),
  );
}

class _ProfileScreen extends StatelessWidget {
  const _ProfileScreen({required this.email, required this.onSignOut});

  final String email;
  final VoidCallback onSignOut;

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.fromLTRB(18, 22, 18, 30),
    children: [
      Text(
        'YOUR CAMPUSFIND ACCOUNT',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Theme.of(context).colorScheme.primary,
          fontWeight: FontWeight.w800,
          letterSpacing: 1,
        ),
      ),
      const SizedBox(height: 7),
      Text('My account', style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 17),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(17),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                radius: 25,
                backgroundColor: const Color(0xFFEAF2FF),
                foregroundColor: Theme.of(context).colorScheme.primary,
                child: Text(
                  email.isEmpty ? '?' : email[0].toUpperCase(),
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 20,
                  ),
                ),
              ),
              const SizedBox(height: 15),
              Text(
                email,
                style: Theme.of(
                  context,
                ).textTheme.titleMedium?.copyWith(fontSize: 15),
              ),
              const SizedBox(height: 6),
              Text(
                'Demo session · account details are not stored.',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: const Color(0xFF718198)),
              ),
              const SizedBox(height: 18),
              OutlinedButton.icon(
                onPressed: onSignOut,
                icon: const Icon(Icons.logout),
                label: const Text('Sign out'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(45),
                ),
              ),
            ],
          ),
        ),
      ),
      const SizedBox(height: 12),
      const _DemoNotice(
        message:
            'Reports are held in memory only and are cleared when the app restarts.',
      ),
    ],
  );
}

class _DemoNotice extends StatelessWidget {
  const _DemoNotice({
    this.message =
        'Development preview: reports and match suggestions use temporary mock data.',
  });

  final String message;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: const Color(0xFFFBFCFF),
      border: Border.all(color: const Color(0xFFE5EBF3)),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Icon(Icons.info_outline, size: 17, color: Color(0xFF2867A9)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            message,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: const Color(0xFF718198),
              fontSize: 10,
              height: 1.5,
            ),
          ),
        ),
      ],
    ),
  );
}
