# 📅 Schichtplan Web-App

Eine moderne, intuitive Web-App für die Schichtplanung von Mitarbeitern, optimiert für mobile Nutzung.

## ✨ Features

### Admin-Ansicht
- 👨‍💼 Vollständige Schichtplanung und -verwaltung
- 📊 Tabellenansicht für alle Bereiche und Schichten
- ➕ Mitarbeiter hinzufügen und verwalten
- 📅 Mehrere Tage planen
- 🔄 Einfaches Zuweisen und Entfernen von Mitarbeitern

### Mitarbeiter-Ansicht
- 👤 Persönliche Schichtübersicht
- 📱 Mobile-optimierte Darstellung
- 📍 Übersicht eigener Schichten mit Zeiten und Bereichen
- 📊 Vollständiger Schichtplan aller Kollegen

### Schicht-Typen
- 🌅 **Frühschicht** (06:00 - 14:00)
- ☀️ **Mittelschicht** (14:00 - 22:00)
- 🌙 **Spätschicht** (22:00 - 06:00)

### Bereiche
- 🏢 Halle
- 💰 Kasse
- 🧖 Sauna
- 🧹 Reinigung
- 🍽️ Gastro

## 🚀 Installation

### Voraussetzungen
- Node.js (Version 16 oder höher)
- npm oder yarn

### Setup

1. **Dependencies installieren:**
```bash
npm install
```

2. **Entwicklungsserver starten:**
```bash
npm run dev
```

Die App ist dann unter `http://localhost:5173` erreichbar.

3. **Produktions-Build erstellen:**
```bash
npm run build
```

4. **Produktions-Build testen:**
```bash
npm run preview
```

## 💾 Datenspeicherung

Die App speichert alle Daten lokal im Browser (localStorage), sodass:
- Keine Backend-Infrastruktur benötigt wird
- Daten bei erneutem Besuch erhalten bleiben
- Die App offline funktioniert

## 📱 Mobile Optimierung

Die App ist vollständig responsive und für mobile Geräte optimiert:
- Touch-freundliche Bedienelemente
- Optimierte Darstellung für kleine Bildschirme
- Schnelle Ladezeiten
- Progressive Web App ready

## 🎨 Technologie-Stack

- **React 18** - UI Framework
- **TypeScript** - Type-sicherer Code
- **Vite** - Build Tool und Dev Server
- **CSS3** - Modernes, responsives Styling

## 📖 Nutzung

### Als Admin:
1. Klicken Sie auf "Admin" in der Navigation
2. Wählen Sie ein Datum aus oder fügen Sie neue Tage hinzu
3. Fügen Sie bei Bedarf neue Mitarbeiter hinzu
4. Weisen Sie Mitarbeiter den verschiedenen Schichten zu
5. Alle Änderungen werden automatisch gespeichert

### Als Mitarbeiter:
1. Klicken Sie auf "Mitarbeiter" in der Navigation
2. Wählen Sie Ihren Namen aus dem Dropdown
3. Sehen Sie Ihre persönlichen Schichten und den Gesamtplan
4. Wechseln Sie zwischen verschiedenen Tagen

## 🔒 Datenschutz

Alle Daten werden ausschließlich lokal im Browser gespeichert. Es findet keine Übertragung an externe Server statt.

## 🛠️ Entwicklung

### Projekt-Struktur
```
Schichtplan/
├── src/
│   ├── components/
│   │   ├── AdminView.tsx      # Admin-Interface
│   │   └── EmployeeView.tsx   # Mitarbeiter-Interface
│   ├── types.ts               # TypeScript Definitionen
│   ├── App.tsx                # Hauptkomponente
│   ├── App.css                # Styling
│   ├── main.tsx               # Entry Point
│   └── index.css              # Globale Styles
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 📄 Lizenz

Privates Projekt - Alle Rechte vorbehalten.

## 🤝 Support

Bei Fragen oder Problemen wenden Sie sich bitte an den Administrator.

---

Erstellt mit ❤️ für effiziente Schichtplanung

