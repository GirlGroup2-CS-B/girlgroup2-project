import 'package:campusfind_mobile/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('demo sign-in opens dashboard and navigation', (tester) async {
    await tester.pumpWidget(const CampusFindApp());

    expect(find.text('Welcome back!'), findsOneWidget);
    final googleButton = tester.widget<OutlinedButton>(
      find.ancestor(
        of: find.text('Continue with Google'),
        matching: find.byType(OutlinedButton),
      ),
    );
    expect(googleButton.onPressed, isNull);
    await tester.enterText(
      find.byType(TextFormField).at(0),
      'student@example.edu',
    );
    await tester.enterText(find.byType(TextFormField).at(1), 'password123');
    await tester.ensureVisible(find.text('Sign in'));
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    expect(find.text('Your campus, connected'), findsOneWidget);
    await tester.tap(find.text('Lost').last);
    await tester.pumpAndSettle();
    expect(find.text('Lost items'), findsOneWidget);
    expect(find.text('Navy blue backpack'), findsOneWidget);
  });

  testWidgets('lost item report validates and appears in the list', (
    tester,
  ) async {
    await tester.pumpWidget(const CampusFindApp());
    await tester.enterText(
      find.byType(TextFormField).at(0),
      'student@example.edu',
    );
    await tester.enterText(find.byType(TextFormField).at(1), 'password123');
    await tester.ensureVisible(find.text('Sign in'));
    await tester.tap(find.text('Sign in'));
    await tester.pumpAndSettle();

    await tester.ensureVisible(find.text('Report'));
    await tester.tap(find.text('Report'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('I lost an item'));
    await tester.pumpAndSettle();

    expect(find.text('Share the details'), findsOneWidget);
    await tester.ensureVisible(find.text('Submit report'));
    await tester.tap(find.text('Submit report'));
    await tester.pumpAndSettle();
    expect(find.text('This field is required.'), findsNWidgets(3));

    await tester.enterText(find.byType(TextFormField).at(0), 'Test backpack');
    await tester.tap(find.text('Category *'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Bags').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField).at(1), 'Main Library');
    await tester.enterText(
      find.byType(TextFormField).at(2),
      'Blue backpack with a yellow tag.',
    );
    await tester.ensureVisible(find.text('Submit report'));
    await tester.tap(find.text('Submit report'));
    await tester.pumpAndSettle();

    expect(find.text('Test backpack'), findsOneWidget);
    expect(
      find.text('Report added to this temporary demo session.'),
      findsOneWidget,
    );
  });
}
