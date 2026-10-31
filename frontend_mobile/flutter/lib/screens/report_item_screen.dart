import 'package:flutter/material.dart';

import '../data/mock_item_repository.dart';
import '../models/campus_item.dart';

class ReportItemScreen extends StatefulWidget {
  const ReportItemScreen({
    required this.repository,
    required this.kind,
    required this.reporter,
    super.key,
  });

  final MockItemRepository repository;
  final ItemKind kind;
  final String reporter;

  @override
  State<ReportItemScreen> createState() => _ReportItemScreenState();
}

class _ReportItemScreenState extends State<ReportItemScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _locationController = TextEditingController();
  final _descriptionController = TextEditingController();
  String? _category;
  DateTime _date = DateTime.now();

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
    _nameController.dispose();
    _locationController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final selected = await showDatePicker(
      context: context,
      initialDate: _date,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (selected != null) {
      setState(() => _date = selected);
    }
  }

  void _submit() {
    if (!(_formKey.currentState?.validate() ?? false) || _category == null) {
      return;
    }
    final item = CampusItem(
      id: 'item-${DateTime.now().microsecondsSinceEpoch}',
      kind: widget.kind,
      name: _nameController.text.trim(),
      category: _category!,
      location: _locationController.text.trim(),
      date: _date,
      description: _descriptionController.text.trim(),
      reporter: widget.reporter,
      symbol: _symbolForCategory(_category!),
    );
    widget.repository.add(item);
    Navigator.of(context).pop(item);
  }

  @override
  Widget build(BuildContext context) {
    final isLost = widget.kind == ItemKind.lost;
    return Scaffold(
      appBar: AppBar(title: Text('Report ${isLost ? 'lost' : 'found'} item')),
      body: Form(
        key: _formKey,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(18, 8, 18, 25),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'HELP YOUR COMMUNITY',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Theme.of(context).colorScheme.primary,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1.1,
                ),
              ),
              const SizedBox(height: 7),
              Text(
                'Share the details',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 6),
              Text(
                'Fields marked with * are required. Your report stays in this demo session only.',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFF64748B),
                  height: 1.5,
                ),
              ),
              const SizedBox(height: 19),
              TextFormField(
                controller: _nameController,
                maxLength: 80,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Item name *',
                  hintText: 'e.g. Navy blue backpack',
                  counterText: '',
                ),
                validator: _requiredValidator,
              ),
              const SizedBox(height: 13),
              DropdownButtonFormField<String>(
                initialValue: _category,
                decoration: const InputDecoration(
                  labelText: 'Category *',
                  prefixIcon: Icon(Icons.category_outlined),
                ),
                items: _categories
                    .map(
                      (category) => DropdownMenuItem(
                        value: category,
                        child: Text(category),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _category = value),
                validator: (value) =>
                    value == null ? 'Choose a category.' : null,
              ),
              const SizedBox(height: 13),
              TextFormField(
                controller: _locationController,
                maxLength: 120,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  labelText: isLost ? 'Where last seen? *' : 'Where found? *',
                  hintText: 'Building, room or nearby landmark',
                  counterText: '',
                  prefixIcon: const Icon(Icons.location_on_outlined),
                ),
                validator: _requiredValidator,
              ),
              const SizedBox(height: 13),
              InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: _selectDate,
                child: InputDecorator(
                  decoration: InputDecoration(
                    labelText: isLost ? 'Date lost *' : 'Date found *',
                    prefixIcon: const Icon(Icons.calendar_today_outlined),
                  ),
                  child: Text(_formatDate(_date)),
                ),
              ),
              const SizedBox(height: 13),
              TextFormField(
                controller: _descriptionController,
                minLines: 3,
                maxLines: 5,
                maxLength: 500,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(
                  labelText: 'Description *',
                  hintText:
                      'Colors, identifying marks, or other helpful details',
                  alignLabelWithHint: true,
                ),
                validator: _requiredValidator,
              ),
              const SizedBox(height: 5),
              OutlinedButton.icon(
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text(
                      'Photo upload will be available when image storage is integrated.',
                    ),
                  ),
                ),
                icon: const Icon(Icons.add_photo_alternate_outlined),
                label: const Text('Add a photo (optional)'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(46),
                  foregroundColor: Theme.of(context).colorScheme.primary,
                ),
              ),
              const SizedBox(height: 17),
              FilledButton.icon(
                onPressed: _submit,
                icon: const Icon(Icons.send_outlined),
                label: const Text('Submit report'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String? _requiredValidator(String? value) =>
    (value?.trim().isEmpty ?? true) ? 'This field is required.' : null;

String _symbolForCategory(String category) => switch (category) {
  'Bags' => '🎒',
  'Documents' => '🪪',
  'Electronics' => '🎧',
  'Accessories' => '🧴',
  _ => '📦',
};

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
