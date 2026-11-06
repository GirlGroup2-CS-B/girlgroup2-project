# CampusFind Flutter mobile frontend

This Flutter app is an additional mobile implementation. The existing Expo app
in the parent `frontend_mobile` folder is preserved and remains unchanged.

The Flutter prototype includes demo authentication, a dashboard, lost/found
item lists with search and category filters, report forms, item details, match
alerts, and a profile screen. Item and match data is provided by an in-memory
mock repository and is cleared when the app restarts. No backend is needed to
run the interface.

From this folder, run:

```powershell
flutter pub get
flutter analyze
flutter test
flutter run
```

The prototype does not connect to the API, upload photos, run image
recognition, or persist reports. Those capabilities need agreed backend
contracts and image-storage/matching integration before they can be enabled.
