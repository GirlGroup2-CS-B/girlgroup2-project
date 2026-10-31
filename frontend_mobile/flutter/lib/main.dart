import 'package:flutter/material.dart';

import 'data/mock_item_repository.dart';
import 'screens/auth_screen.dart';
import 'screens/campus_shell.dart';

void main() {
  runApp(const CampusFindApp());
}

class CampusFindApp extends StatefulWidget {
  const CampusFindApp({super.key});

  @override
  State<CampusFindApp> createState() => _CampusFindAppState();
}

class _CampusFindAppState extends State<CampusFindApp> {
  final MockItemRepository _repository = MockItemRepository();
  String? _email;

  @override
  Widget build(BuildContext context) {
    const navy = Color(0xFF17165C);
    const blue = Color(0xFF174A8B);

    return MaterialApp(
      title: 'CampusFind',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: blue,
          primary: blue,
          secondary: const Color(0xFFFFC928),
          surface: const Color(0xFFFFFFFF),
        ),
        scaffoldBackgroundColor: const Color(0xFFF5F7FC),
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.white,
          foregroundColor: navy,
          surfaceTintColor: Colors.transparent,
          elevation: 0,
        ),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: Color(0xFFE5EBF3)),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFFBFCFF),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 14,
            vertical: 13,
          ),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFDCE5F0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: Color(0xFFDCE5F0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(10),
            borderSide: const BorderSide(color: blue, width: 1.5),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            minimumSize: const Size.fromHeight(48),
            backgroundColor: blue,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
            ),
            textStyle: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ),
        textTheme: const TextTheme(
          headlineSmall: TextStyle(
            color: navy,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.5,
          ),
          titleLarge: TextStyle(
            color: navy,
            fontWeight: FontWeight.w800,
            letterSpacing: -0.4,
          ),
          titleMedium: TextStyle(color: navy, fontWeight: FontWeight.w700),
        ),
      ),
      home: _email == null
          ? AuthScreen(onAuthenticated: _signIn)
          : CampusShell(
              email: _email!,
              repository: _repository,
              onSignOut: () => setState(() => _email = null),
            ),
    );
  }

  void _signIn(String email) {
    setState(() => _email = email);
  }
}
