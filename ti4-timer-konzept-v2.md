# Twilight Timer: Konzept und Entwicklungsplan (Version 2)

Stand: 6. November 2026 · Status: **Entwurf zur Freigabe** (ersetzt `ti4-timer-konzept.md`)

Dieses Dokument ist die Grundlage für die Entwicklung mit Claude Code. Es gibt keine feste Deadline; der Plan besteht aus Meilensteinen, die nacheinander zu einer vollständigen Version 1.0 führen. Seit Version 1 neu: die Entscheidungen des Nutzers vom 5./6.11., die Regelprüfung durch den TI4-Experten und die Diskussion zum Zeitmodell.

Kennzeichnung:

- **[Q]** in einer gelesenen Quelle oder den Screenshots belegt
- **[W]** Fachwissen, nicht in einer gelesenen Quelle bestätigt
- **[A]** Entwurfsentscheidung oder Annahme, änderbar
- **[OFFEN]** nicht geklärt

---

## 1. Ziel und Anforderungen

Ein Timer für **Twilight Imperium 4** (Basisspiel, Prophecy of Kings, Thunder's Edge), der den echten Spielablauf abbildet und Zeitlimits durchsetzt. Er läuft auf dem iPad im Querformat, notfalls im Laptop-Browser. Es geht ausschließlich um TI4, nicht um ein Baukastensystem für andere Spiele.

Vom Nutzer festgelegt:

1. Der Ablauf folgt den Regeln, sodass die Gruppe nicht nachdenken muss. Die Strategiekarte bestimmt die Reihenfolge in der Aktionsphase. In Runde 1 gilt für die Kartenwahl die Sitzreihenfolge aus dem Draft (Multidraft), der Sprecher beginnt.
2. **Alle Spieler haben dieselben Zeiten**, egal ob Anfänger oder Fortgeschrittene. Es gibt keine Einstellung pro Spieler.
3. Die Zeiten sind in den **Einstellungen vor dem Anlegen eines Spiels** einstellbar: Aktionsphase, Strategiephase, Agendaphase.
4. Die Agendaphase wird gespielt, sobald sie freigeschaltet ist. Am Ende der Aktionsphase fragt die App: „Agendaphase aktiv? Ja / Nein“. Bei „Nein“ kommt die Frage jede Runde wieder, ab „Ja“ ist die Agendaphase dauerhaft aktiv.
5. **Sekundäraktionen haben kein Limit und kosten keine Zeit.** Eine hochlaufende Uhr zeigt nur an, wie lange sie dauern.
6. Jeder Spieler hat eine **Farbe**, damit man von weitem sieht, wer dran ist.
7. **Undo und Redo**, falls man einen Spieler zu weit gesprungen ist.
8. Prophecy of Kings ist dabei, Thunder's Edge kommt bald dazu. Spielvarianten (zum Beispiel Naalu) sind per Schalter an- und ausschaltbar.
9. Keine Sprachausgabe, kein Combat Calculator.
10. **Sprache der Oberfläche:** Kurze Begriffe zweisprachig mit Schrägstrich („Leadership / Führungsstärke“), längere Texte auf Deutsch. Längere Texte sollen kaum vorkommen.
11. **Pause-Button:** Ein prominenter Pause-Button ist in jeder Phase sichtbar und hält alle Uhren an.
12. **App-Name:** Twilight Timer. GitHub-Konto: Triseck01.

---

## 2. Entscheidungen im Überblick

| Thema | Entscheidung |
|---|---|
| Plattform | PWA (Web-App), auf dem iPad zum Home-Bildschirm hinzugefügt; läuft auch im Laptop-Browser |
| Hosting | GitHub Pages (HTTPS nötig für Service Worker und Display-Wachhalten) |
| Technik | Vanilla JavaScript (ES-Module), kein Build-Schritt, Tests mit `node --test` |
| Entwicklung | Claude Code auf dem Windows-PC; das MacBook hilft nur beim Safari-Debugging am iPad |
| Vorbild | Nur die Bedienidee der App „TI Timer“; eigener Name, Layout und Gestaltung, keine Code- oder Grafikübernahme |
| Zeitmodell | Ein Modell mit Parametern, drei Voreinstellungen: **„Bank mit Gutschrift“ (Standard)**, „Hybrid“ und „Nur Zeiten“ ohne Bank; dazu „Eigene“ (Abschnitt 4) |
| Zeiten | für alle Spieler gleich, einstellbar vor Spielbeginn |
| Sekundäraktionen | kein Limit, nicht in der Rechnung; hochlaufende Anzeige; ein Button „Sekundär abgeschlossen“ |
| Bei Zeitablauf | Anzeige läuft rot ins Minus; Signalton beim Umspringen auf Rot und nach 30 s Überzeit; keine Automatik |
| Pause | prominenter Button in jeder Phase, hält alle Uhren an |
| Undo/Redo | ja |
| Nicht enthalten | Sprachausgabe, Haptik, Combat Calculator, Zeiten pro Spieler, andere Spiele |

---

## 3. Spielregeln, die der Ablauf abbilden muss

Ergebnis der Regelprüfung durch den TI4-Experten. Quellen: Living Rules Reference (LRR, ti4rules.github.io), Quick Reference, Scott-Regelzusammenfassung, Prophecy-of-Kings-Rules-Gist, RulesPal, Board Game Arena, TI-Wiki, Fantasy-Flight-Ankündigung zu Thunder's Edge (siehe Quellenliste).

### 3.1 Rundenablauf

Strategiephase → Aktionsphase → Statusphase → Agendaphase (nur wenn freigeschaltet) → nächste Runde. Die Agendaphase folgt **nach** der Statusphase. [Q]

### 3.2 Strategiephase: Wahlreihenfolge (Korrektur gegenüber der Annahme)

- **In jeder Runde** wählt zuerst der **Sprecher**, danach im Uhrzeigersinn. [Q]
- Die Wahlreihenfolge hängt **nicht** von den Kartennummern der Vorrunde ab. In keiner gelesenen Quelle gibt es eine solche Kopplung. [Q, indirekt]
- Die Kartennummer (Initiative) bestimmt die Reihenfolge **in der Aktionsphase** und beim **Werten der Ziele in der Statusphase**. [Q]
- Die Wahlreihenfolge ändert sich nur, wenn der **Sprecher-Token wechselt**: durch die Politics-Primärfähigkeit oder wenn der Sprecher aus dem Spiel ausscheidet. Weitere Fälle sind nicht belegt. [Q] [OFFEN]
- Bei **3 oder 4 Spielern** wählt jeder zwei Karten (zweiter Durchgang). Der zweite Durchgang läuft laut den Quellen wohl in derselben Reihenfolge, das steht aber nirgends ausdrücklich. [Q, indirekt] [OFFEN] Bei 5 oder mehr Spielern: eine Karte pro Spieler. Für das Spiel zu fünft ist das irrelevant.
- Nicht gewählte Karten erhalten Handelswaren. Wer sie wann legt, beschreiben die Quellen uneinheitlich. [OFFEN] Die App zählt sie als Hinweis mit (Schalter).

### 3.3 Aktionsphase

- Es wird in Initiativreihenfolge gespielt, je eine Aktion pro Zug, bis alle gepasst haben. [Q]
- Bei zwei Karten zählt die **niedrigere** Kartennummer. Man darf mit einer der beiden Karten beginnen; zwei Züge hintereinander gibt es nicht (Community-Konsens). [Q]
- Nach einer **Primäraktion** können die anderen die **Sekundäraktion** nutzen, im Uhrzeigersinn beginnend links vom aktiven Spieler. Sie ist optional. [Q]
- **Passen** geht erst, wenn man seine Strategiekarte(n) benutzt hat (bei zwei Karten: beide). Wer keine Aktion ausführen kann, muss passen. [Q]
- **Gepasste Spieler** dürfen weiter Sekundäraktionen fremder Karten nutzen. Der Timer darf sie also nicht ausblenden. [Q]
- Haben **alle anderen gepasst**, spielt der letzte Spieler mehrere Aktionen hintereinander. [Q] Die App startet dann für jede Aktion eine neue Zugzeit.
- Die Phase endet, wenn alle gepasst haben. [Q]

### 3.4 Statusphase

Acht Schritte: Ziele werten (nach Initiative), öffentliches Ziel aufdecken, Aktionskarte ziehen, Befehlsmarker entfernen, zwei Befehlsmarker erhalten und verteilen, Karten bereitmachen, Einheiten reparieren, Strategiekarten zurückgeben. [Q] Nur die Zielwertung hat eine Reihenfolge. Die Statusphase wird **nicht gezeitet**.

### 3.5 Agendaphase

- **Freischaltung:** Erst wenn der **Custodians-Token** von Mecatol Rex entfernt wurde. Das passiert bei einer Invasion; der aktive Spieler zahlt 6 Einfluss, landet mindestens eine Bodentruppe und erhält 1 Siegpunkt. [Q]
- **Gleiche Runde:** Wurde der Token in Runde X genommen, wird die Agendaphase schon in Runde X (nach dem Status) gespielt, dann in jeder weiteren Runde. [Q]
- **Folge für die Abfrage:** Die Frage „Agendaphase aktiv?“ passt, wenn alle gepasst haben, denn der Token kann nur in der Aktionsphase genommen werden. Antwort „Ja“: Nach der Statusphase folgt die Agendaphase der **gleichen Runde**. [Q]
- **Ablauf:** Zwei Agenden pro Phase. Der Sprecher zieht und liest vor. Abgestimmt wird **links vom Sprecher beginnend im Uhrzeigersinn, der Sprecher zuletzt**. Stimmen entstehen durch Erschöpfen von Planeten; Enthaltung ist möglich. Bei Gleichstand entscheidet der Sprecher. [Q]
- **Planeten bereitmachen** erst nach der zweiten Agenda, nicht dazwischen. [Q]
- Zeitfenster für Aktionskarten (zum Beispiel Riders) und Verhandlungen: nicht belegt, daher kein eigener Timer. [OFFEN]

### 3.6 Sprecher

Der Sprecher-Token wechselt durch die Politics-Primärfähigkeit (der aktive Spieler wählt einen Spieler, auch sich selbst) oder wenn der Sprecher ausscheidet (Token geht nach links). [Q] Weitere Wechsel durch Gesetze oder Karten sind nicht belegt. [OFFEN] Der neue Sprecher gilt schon in der Agendaphase derselben Runde und in der nächsten Strategiephase. [W] Die App erlaubt deshalb jederzeit ein manuelles „Sprecher ändern“.

### 3.7 Naalu

- Wer den **Initiative-0-Token** hält, hat Initiative 0: erster Zug in der Aktionsphase, erste Zielwertung im Status. [Q]
- Naalu wählt trotzdem eine normale Strategiekarte; der Token liegt zusätzlich dabei. [Q, indirekt]
- Der Token kann durch die Naalu-Karte „Gift of Prescience“ zu einem anderen Spieler wechseln. [W] Den Kartentext konnten wir nicht belegen, auch nicht, wie das mit zwei Karten (3 bis 4 Spieler) zusammenspielt. [OFFEN]
- Umsetzung: Schalter „Naalu im Spiel“ und pro Runde ein Feld „Token-Inhaber“ (Standard: der Naalu-Spieler). [A]

### 3.8 Prophecy of Kings und Thunder's Edge

- PoK: Setups für 7 und 8 Spieler; bei mehr als 6 Spielern vermutlich eine Karte pro Spieler. [Q, teils W] Die Strategiekarten Construction und Diplomacy wurden ersetzt (an Wahlreihenfolge und Initiative ändert das nichts).
- Thunder's Edge: Warfare und Construction liegen in Ω-Versionen vor. Die Quellen beschreiben **keine Änderung** an Wahlreihenfolge oder Initiative. [Q] Es gibt aber Karten und Ereignisse mit Wirkung auf den Ablauf: Hack Election ändert die Abstimmungsreihenfolge, Galactic Events können Abstimmungen verändern, einzelne Aktionskarten geben Zusatzaktionen oder lassen einen Zug überspringen. [Q, nur Zusammenfassungen] [OFFEN, vollständige Liste]
- **Folge:** Die App bildet diese Sonderfälle nicht einzeln ab, sondern bietet manuelle Eingriffe (Abschnitt 5.4). Damit bleibt der Ablauf auch bei Regelabweichungen bedienbar.
- Twilight's Fall (eigener Modus von Thunder's Edge) ist für diesen Timer nicht vorgesehen.

### 3.9 Weitere Regeln mit Wirkung auf den Timer

1. **Spielende jederzeit:** Das Spiel endet sofort, wenn jemand das Siegpunktziel erreicht, in jeder Phase. Die App hat in jeder Phase einen Knopf „Spiel beendet“. [Q]
2. Ausscheiden eines Spielers ändert Sprecher, Kartenzahl pro Spieler und den Naalu-Token. [Q] Die App bietet dafür nur den manuellen Eingriff „Spieler entfernen“ (ab Version 1.x).

---

## 4. Zeitmodell

Alle Werte sind **global** (für jeden Spieler gleich) und in den Einstellungen änderbar, bevor ein Spiel angelegt wird. Beim Anlegen wird eine Kopie gespeichert; spätere Änderungen verändern ein laufendes Spiel nicht. [A]

### 4.1 Aktionsphase: ein Modell, drei Voreinstellungen

Die zwei vom Nutzer genannten Varianten sind im Kern **dasselbe Modell mit anderen Parametern** (Schachuhr mit Verzögerung gegen Fischer-Inkrement):

| Parameter | Bedeutung |
|---|---|
| `Zugzeit` | Zeit pro Zug, Standard 1:30 |
| `Startbank` | persönliche Reserve pro Spieler, für alle gleich |
| `Gutschrift` | Schalter: ungenutzte Zugzeit wird der Bank gutgeschrieben |
| `Pass gutschreiben` | nur bei Gutschrift: Standard **aus** |
| `Bank-Obergrenze` | nur bei Gutschrift: Standard 60:00 |

| Voreinstellung | Zugzeit | Startbank | Gutschrift | Wirkung |
|---|---|---|---|---|
| **Bank mit Gutschrift** (**Standard**) | 1:30 | 30:00 | an (Pass ohne Gutschrift, Obergrenze 60:00) | Wer weniger als 1:30 braucht, schreibt die Differenz der Bank gut. Die Bank sinkt nur bei Zügen über 1:30. |
| **Hybrid** (wie gotimer.org) | 1:30, frei einstellbar | 60:00, frei einstellbar | aus | Zugzeit läuft zuerst; danach sinkt die Bank. Ungenutzte Zugzeit verfällt. Zeiten über das Menü änderbar. |
| **Nur Zeiten** | 1:30, frei einstellbar | keine Bank | aus | Reines Zeitlimit pro Zug, keine Reserve. Überschreitung wird rot angezeigt. |
| **Eigene** | frei | frei | frei | schaltet automatisch um, sobald man ein Feld ändert |

Startbank 0 ohne Gutschrift ergibt ein reines Zug-Limit („Nur Zeiten“).

**Entscheidung des Nutzers: Standard ist „Bank mit Gutschrift“** (Pass ohne Gutschrift, Bank-Obergrenze 60:00). Begründung der Experten: Bei Hybrid verbrauchen typische Spieler grob nur etwa 6 von 60 Minuten Bank (Schätzung), das erzeugt kaum Druck. „Bank mit Gutschrift“ belohnt schnelle Züge, hat die kleinere Obergrenze (66 gegenüber 96 Minuten pro Spieler) und verschiebt nur Zeit von leichten zu schweren Zügen: In beiden Modellen gilt Gesamtzeit ≤ Startbank + Züge × 1:30.

**Passen und Gutschrift:** Passen ist in jeder Runde erzwungen und dauert nur wenige Sekunden. Mit Gutschrift gäbe das jedem Spieler rund 80 Sekunden pro Runde, also über sechs Runden etwa 8 Minuten „Inflation“ ohne Entscheidung. Deshalb schreibt Passen standardmäßig **nichts gut**. Kurze Komponentenaktionen werden gutgeschrieben.

Formel (zeitstempelbasiert, nie per Tick-Zählung):

```
benutzt = Zeit des Zuges (ohne Pausen)
bank   -= max(0, benutzt - zugzeit)                     // Überlauf kostet Bank
falls gutschrift und (kein Pass oder passGutschreiben):
    bank = min(bank + max(0, zugzeit - benutzt), bankObergrenze)
// kein Abschneiden bei 0: die Bank darf negativ werden, Anzeige rot
// Live-Anzeige: bankLive = bank - max(0, vergangen - zugzeit)
```

### 4.2 Sekundäraktionen

Sekundäraktionen sind **nicht gezeitet und nicht Teil der Rechnung**:

1. Bei einer Strategiekarte tippt der aktive Spieler auf **„Primär erledigt“**. Seine Zugzeit wird damit festgeschrieben und abgerechnet.
2. In der Sekundärphase läuft **keine Zugzeit und keine Bank**. Eine **hochlaufende Anzeige** zeigt nur, wie lange die Sekundärphase dauert. Sie hat **keine Grenze**, färbt sich nicht rot und fließt in keine Rechnung ein.
3. Ein einziger Button **„Sekundär abgeschlossen“** startet den nächsten Spieler nach Initiative.

Ein einzelner Button statt „jeder Spieler tippt für sich“ spart bei fünf Spielern etwa 18 Taps pro Runde. Das Risiko, dass jemand den Button vergisst, kostet niemanden Zeit; der Tisch merkt es sofort. Taktische Aktionen und Komponentenaktionen haben diesen Schritt nicht. [Entscheidung des Nutzers]

### 4.3 Strategiephase

**5:00 pro Wahl und Spieler.** Feste Zeit, kein Zugriff auf die Bank. Bei Überschreitung wird die Anzeige **rot**, und es ertönt **sofort ein Signalton**. Läuft die Überzeit **30 Sekunden** weiter, ertönt ein **zweites Signal**. Reihenfolge: Sprecher zuerst, im Uhrzeigersinn; bei 3 bis 4 Spielern zwei Durchgänge.

### 4.4 Agendaphase

**3:00 pro Spieler pro Agenda** in der Abstimmungsreihenfolge (links vom Sprecher, Sprecher zuletzt). Feste Zeit, kein Zugriff auf die Bank; Überschreitung wie in 4.3 (rot, Signalton sofort und nach 30 s Überzeit). Eine gemeinsame Diskussionsuhr gibt es nicht; die Diskussion läuft in TI4 meist informell mit der Abstimmung, und wer nicht abstimmen will, tippt sofort weiter. Eine optionale Diskussionsuhr kann später ergänzt werden.

### 4.5 Statusphase

Keine Uhr. Ein Button „Weiter“.

### 4.6 Standardwerte

| Einstellung | Standard |
|---|---|
| Voreinstellung Bank | Bank mit Gutschrift (Alternativen: Hybrid, Nur Zeiten, Eigene) |
| Zugzeit Aktionsphase | 1:30 |
| Startbank pro Spieler | 30:00 (Hybrid-Voreinstellung: 60:00) |
| Gutschrift ungenutzter Zugzeit | an (Hybrid: aus) |
| Pass gutschreiben | aus |
| Bank-Obergrenze | 60:00 |
| Strategiewahl pro Wahl | 5:00 |
| Agenda pro Spieler und Agenda | 3:00 |
| Statusphase | keine Uhr |
| Warnung | bei 30 s und 10 s Restzeit |
| Signal bei Überzeit (Strategie, Agenda) | Ton beim Umspringen auf Rot und ein zweiter nach 30 s Überzeit |
| Sekundäranzeige | hochlaufend, ohne Limit |

Die Einstellungsseite zeigt eine **Live-Zeile** („Maximal ≈ … h, typisch ≈ … h bei n Spielern“), damit man die Wirkung der Werte sieht.

### 4.7 Einordnung der Werte (Schätzung der Experten, nicht gemessen)

Annahmen: fünf Spieler, sechs Runden, vier Züge pro Spieler und Runde (inklusive Passen), Agenda ab Runde 3 mit zwei Agenden.

| Bereich | Obergrenze (alles ausgereizt) | Realistisch (Schätzung) |
|---|---|---|
| Strategiephase | 25 min pro Runde, 150 min pro Spiel | etwa 5 min pro Runde, 30 min pro Spiel |
| Aktionsphase, nur Zugzeit | 30 min pro Runde, 180 min pro Spiel | etwa 25 min pro Runde, 150 min pro Spiel |
| Aktionsphase mit Bank | zusätzlich +300 min (Hybrid) bzw. +150 min (Bank mit Gutschrift) | wie oben |
| Agendaphase | 30 min pro Runde, 120 min pro Spiel | etwa 15 min pro Runde, 60 min pro Spiel |
| **Summe** | **Hybrid etwa 12,5 h, Bank mit Gutschrift etwa 10 h** | **etwa 4 h (Spanne 3,5 bis 5 h)** |

Einordnung: 5:00 pro Strategiewahl und 3:00 pro Agenda-Stimme sind **großzügige Obergrenzen** (Strategiewahl etwa das Fünffache, Agenda etwa das Doppelte der realistischen Dauer), also ein Sicherheitsnetz statt eines Taktgebers. Wer mehr Tempo will, stellt sie später kürzer ein. Die Standardwerte bleiben wie vom Nutzer vorgegeben.

Spielerzahl: Die Startbank hängt nicht von der Spielerzahl ab. Bei 7 bis 8 Spielern zeigt die App nur den Hinweis „Startbank um etwa 25 % senken?“, wendet ihn aber nie automatisch an. [A]

### 4.8 Bei Zeitablauf

Die Anzeige läuft rot ins Minus; Farbe und (nach Start-Antippen) Ton warnen: ein Signal beim Umspringen auf Rot und ein zweites nach 30 Sekunden Überzeit. In der Strategie- und Agendaphase ist das festgelegt; in der Aktionsphase gilt dasselbe Schema, sobald Zugzeit und Bank aufgebraucht sind [A]. **Keine Automatik**, kein Auto-Pass (Passen erst nach der eigenen Strategieaktion) und keine Auto-Weitergabe. Ein Eingriff „Bank ±1 Minute“ korrigiert Fehlbedienungen.

### 4.9 Pause

Ein **prominenter Pause-Button** ist in jeder Phase sichtbar und hält **alle Uhren** an (auch die hochlaufende Sekundäranzeige). Ein Overlay macht den Pausenzustand unübersehbar; ein großer Button setzt fort. Die Pausenzeit wird getrennt mitgezählt.

---

## 5. Bedienung und Ablauf in der App

### 5.1 Einstieg

1. **Einstellungen:** Voreinstellung (Hybrid / Bank mit Gutschrift / Eigene), alle Zeiten, Schalter. Vor dem Spiel einstellbar.
2. **Neues Spiel:** 3 bis 8 Spieler, Name und **Farbe** pro Spieler, Sitzreihenfolge im Uhrzeigersinn (aus dem Draft), Sprecher markieren, Schalter für Varianten (Abschnitt 6), Zusammenfassung zum Bestätigen.

### 5.2 Spielansicht (Querformat)

```
┌──────────────────────────────────────────────────────────┬─────────┐
│ [Initiative-Leiste: alle Spieler, aktiver hervorgehoben] │ GROSSER │
│ Runde 1 · Aktionsphase · 0/5 gepasst                     │ WEITER- │
├──────────────────────────────────────────────────────────┤ BUTTON  │
│   ● SPIELERNAME (große Fläche in Spielerfarbe)           │         │
│   Strategiekarte  [Badge: antippen = benutzt]            ├─────────┤
│                                                          │ Passen  │
│        1:12  (große Restzeit)       Bank 27:40           │ Undo    │
│        ▓▓▓▓▓▓▓░░░░░░  Zugzeit-Balken                     │ Redo    │
│   Als Nächstes: René (3)                                 │ Pause   │
└──────────────────────────────────────────────────────────┴─────────┘
```

- **Spielerfarbe als große Fläche** (Rahmen und Hintergrundton der Zeitkarte), damit man den aktiven Spieler aus Distanz erkennt. Der Name steht zusätzlich in großer Schrift; Farbe ist nie das einzige Merkmal.
- Die Restzeit ist die größte Zahl auf dem Bildschirm.
- Der große Button rechts ist mit dem Daumen gut zu treffen; seine Beschriftung wechselt je nach Schritt.
- Dunkles Design.
- Warnung: Farbwechsel bei 30 s und 10 s, danach Rot im Minus.
- **Pause-Button** gut sichtbar und mit dem Daumen erreichbar, in jeder Phase.
- Kartenanzeige zweisprachig, zum Beispiel „Leadership / Führungsstärke“.

### 5.3 Ablauf eines Zuges (Aktionsphase)

1. Spieler wird aktiv, Zugzeit läuft, Button zeigt **„Nächster Spieler“**.
2. **Taktische Aktion** oder Komponentenaktion: Spieler tippt „Nächster Spieler“; die Bank wird abgerechnet, der nächste nach Initiative wird aktiv.
3. **Strategiekarte:** Spieler tippt das Karten-Badge (Karte benutzt, Badge wird durchgestrichen). Der Button wechselt zu **„Primär erledigt“**. Passen bleibt gesperrt, bis alle Karten des Spielers benutzt sind.
4. „Primär erledigt“ rechnet den Zug ab und öffnet die **Sekundärphase**: eine hochlaufende Anzeige ohne Limit und ein Button **„Sekundär abgeschlossen“**.
5. Danach folgt der nächste Spieler nach Initiative.
6. **Passen:** Der Spieler wird aus der Zugreihenfolge genommen, bleibt aber in der Leiste sichtbar und für Sekundäraktionen relevant. Passen schreibt standardmäßig keine Zeit gut.
7. Haben alle gepasst, erscheint die Frage **„Agendaphase aktiv? Ja / Nein“** (entfällt, sobald sie einmal mit „Ja“ beantwortet wurde), danach **„Statusphase starten“**.

### 5.4 Manuelle Eingriffe (für Sonderfälle und Thunder's Edge)

Erreichbar über ein Menü, damit der Ablauf nie blockiert:

- Sprecher ändern
- Zug überspringen (zum Beispiel „Crisis“)
- Zusatzaktion gewähren (zum Beispiel Zusatzzug nach dem Passen)
- Abstimmungsreihenfolge ändern (zum Beispiel „Hack Election“)
- Strategiekarten neu zuweisen (Schalter „Neuzuweisung erlauben“, wie in der Vorbild-App)
- Initiative-0-Token-Inhaber ändern (Naalu)
- Bank ±1 Minute
- Aktiven Spieler direkt wählen
- **Spiel beenden** (Siegpunktziel erreicht), in jeder Phase

Alle Eingriffe sind per Undo rücknehmbar.

### 5.5 Undo und Redo

Jede Aktion (Zugende, „Sekundär abgeschlossen“, Passen, Phasenwechsel, Eingriff) speichert einen unveränderlichen Schnappschuss (etwa 30 Schritte, jeweils rund 1 KB). Undo stellt Zustand und Bank wieder her, Redo geht vor. Beim Wiederherstellen startet die Uhr neu, sodass die Zeit zwischen Fehlklick und Undo **niemandem** angerechnet wird. Eine Aktion nach einem Undo verwirft den Redo-Zweig.

### 5.6 Strategiephase

Reihum wählen ab Sprecher im Uhrzeigersinn, ein Raster mit 8 Karten, bereits vergebene Karten ausgegraut, Timer pro Wahl, bei 3 bis 4 Spielern zwei Durchgänge. Optional (Schalter): Handelswaren-Hinweis („Nimmt 2 Handelswaren“) und Initiative-0-Token. Danach errechnet die App die Aktionsreihenfolge.

Strategiekarten (Nummer = Initiative), zweisprachig angezeigt:

| Nr. | Englisch / Deutsch |
|---|---|
| 1 | Leadership / Führungsstärke |
| 2 | Diplomacy / Diplomatie |
| 3 | Politics / Politik |
| 4 | Construction / Infrastruktur |
| 5 | Trade / Handel |
| 6 | Warfare / Kriegsführung |
| 7 | Technology / Technologie |
| 8 | Imperial / Imperium |

### 5.7 Statusphase und Agendaphase

- **Status:** Keine Uhr; Button „Weiter“.
- **Agenda** (wenn aktiv): Agenda 1 → Abstimmung reihum (3:00 pro Spieler, links vom Sprecher beginnend, Sprecher zuletzt) → „Nächste Agenda“ → Agenda 2 → danach nächste Runde. Ein Hinweis erinnert, dass Planeten nach der zweiten Agenda bereitgemacht werden.
- **Neue Runde:** Karten werden zurückgegeben, nicht gewählte Karten bekommen ein Handelsgut (falls Schalter an).

---

## 6. Schalter und Varianten

| Schalter | Standard | Wirkung |
|---|---|---|
| Prophecy of Kings | an | 3 bis 8 Spieler zulassen |
| Thunder's Edge | aus | zeigt die manuellen Eingriffe (5.4) deutlicher an |
| Naalu im Spiel | aus | Initiative-0-Token mit Feld „Token-Inhaber“ pro Runde |
| Handelswaren-Tracking | an | +1 Handelsgut pro Runde auf ungewählten Karten, Hinweis bei der Wahl |
| Agendaphase aktiv | aus | wird per Abfrage am Ende der Aktionsphase gesetzt und kann im Menü korrigiert werden |
| Gutschrift | siehe Voreinstellung | siehe 4.1 |

---

## 7. Technik und Architektur

### 7.1 Gewählte Lösung

PWA in Vanilla-JS mit ES-Modulen, ohne Framework und ohne Build-Schritt, gehostet auf GitHub Pages. Gründe: schnelle Umsetzung, kostenlos, läuft auf iPad und Laptop, kein Apple-Developer-Konto, keine Xcode-Signierung. Native iOS (SwiftUI) und Cross-Platform sind bewusst nicht gewählt.

### 7.2 Modulstruktur

```
ti4-timer/
  index.html
  manifest.webmanifest
  sw.js                    // Service Worker; Cache-Version bei jedem Release erhöhen
  src/
    model/types.js         // JSDoc-Typen
    logic/
      time.js              // zeitstempelbasierte Rechnung: Zugzeit, Bank, Gutschrift, Pause
      order.js             // Wahlreihenfolge, Initiative, Initiative 0, zwei Karten,
                           // Sekundärreihenfolge, Abstimmungsreihenfolge
      stateMachine.js      // Phasen und Schritte, reine Funktionen
      history.js           // Undo/Redo-Schnappschüsse
      config.js            // Standardwerte, Voreinstellungen
    content/cards.js       // 8 Strategiekarten, zweisprachige Namen
    store/persist.js       // localStorage, Schema-Version, JSON-Export/-Import
    ui/                    // Einstellungen, Neues Spiel, Spielansicht, Spieleliste
    platform/
      audio.js             // Start-Antippen schaltet Ton frei
      wakelock.js          // Display wachhalten
  test/                    // node --test
```

Die Logikschicht enthält keinen DOM-Zugriff und wird per Unit-Test geprüft.

### 7.3 Datenmodell (Skizze)

```js
config = {
  preset: 'credit' | 'hybrid' | 'timesOnly' | 'custom',
  turnSec, startBankSec, credit, creditPass, bankCapSec,   // Aktionsphase
  strategyPickSec,                                          // Strategiephase
  agendaVoteSec,                                            // Agendaphase
  warnAtSec: [30, 10]
}
variants = { pok, thundersEdge, naalu, tradeGoods }
game = {
  version, config, variants,
  players: [{ id, name, color, bankSec, passed }],  // Reihenfolge = Sitz ab Sprecher
  speakerId, agendaActive, round,
  phase: 'strategy' | 'action' | 'status' | 'agenda',
  cards: { 1..8: { ownerId|null, tradeGoods, used } },
  initiativeZeroHolder: playerId | null,
  order: [playerIds],                      // nach Initiative, 0 zuerst
  step: { kind: 'pick' | 'turn' | 'secondary' | 'status' | 'agendaVote',
          actorId, queue: [ids], index },
  active: { playerId, kind, limitSec, usesBank,
            baseSec,                       // bereits abgerechnete Sekunden dieses Segments
            runningSince },                // ms-Zeitstempel oder null (Pause, Sekundär)
  history: [Snapshot], cursor
}
```

Uhrzustand: `vergangen = baseSec + (runningSince ? (jetzt − runningSince)/1000 : 0)`. Pause und Sekundärphase sind derselbe Zustand (`runningSince = null`).

### 7.4 Plattform-Eigenheiten (iPad/Safari) [A, am Gerät prüfen]

- **Ton:** erst nach Antippen freigeschaltet (Start-Button), folgt eventuell dem Stummschalter. Deshalb zusätzlich visueller Alarm.
- **Display wachhalten:** Screen Wake Lock API ab iOS 16.4; im Home-Bildschirm-Modus teils fehlerhaft. Gegenmaßnahme: Hinweis „Automatische Sperre auf ‚Nie‘“, Test am Gerät, bei Scheitern ein Video-Trick als Notlösung.
- **Zeitmessung:** nur über Zeitstempel, da Safari Timer im Hintergrund drosselt.
- **Offline:** Service Worker; nach dem ersten Laden muss die App ohne Netz starten.
- **HTTPS:** nötig für Service Worker und Wake Lock; GitHub Pages liefert es.
- **iOS-Version:** mindestens 16.4 empfohlen (Einstellungen → Allgemein → Info).

### 7.5 Rechtliches und Abgrenzung

Eigener App-Name, eigene Symbole und eigene Gestaltung. Keine Grafiken oder Texte von Fantasy Flight Games und kein Nachbau der Oberfläche der Vorbild-App. Ideen und Bedienkonzept sind nicht geschützt; Code, Grafiken und Texte der fremden App werden nicht übernommen. (Keine Rechtsberatung.) Open-Source-Schachuhren (zum Beispiel `radulle/chess-clock`, MIT) taugen höchstens als Muster; Selbstschreiben ist einfacher.

---

## 8. Entwicklungsplan

Die Reihenfolge liefert in jedem Meilenstein ein lauffähiges, testbares Ergebnis. Nach jedem Meilenstein wird kurz abgenommen.

### M0 Projektgrundlage

- Neues GitHub-Repository, GitHub Pages aktivieren (Branch `main`, Ordner `/`).
- Ordnerstruktur, Manifest und Service-Worker-Gerüst, `README.md` und `CLAUDE.md` mit den Regeln aus Abschnitt 3 und den Entscheidungen aus Abschnitt 2 und 4.
- Name „Twilight Timer“ und eigenes Icon.
- **Abnahme:** Leere Seite per HTTPS auf dem iPad aufrufbar und zum Home-Bildschirm hinzufügbar.

### M1 Kernlogik ohne Oberfläche

- Zeitrechnung: Zugzeit, Bank, Gutschrift (mit „Pass gutschreiben“ und Obergrenze), Pause, Zeitstempel.
- Reihenfolgen: Wahlreihenfolge ab Sprecher, Initiative, Initiative 0, zwei Karten bei 3 bis 4 Spielern, Sekundärreihenfolge, Abstimmungsreihenfolge (Sprecher zuletzt).
- Zustandsmaschine für Phasen und Schritte, Passen-Regel, Undo/Redo.
- **Abnahme:** Unit-Tests grün. Mindestens: Wahlreihenfolge unabhängig von Vorrunde, Aktionsreihenfolge nach Initiative, Naalu 0, Passen gesperrt vor Kartenbenutzung, Bank mit und ohne Gutschrift, Pass ohne Gutschrift, Bank darf negativ werden, Undo/Redo stellt die Bank wieder her, Sekundärphase ohne laufende Uhr.

### M2 Einstellungen und Spiel anlegen

- Einstellungsseite: Voreinstellungen, alle Zeiten, Schalter, Live-Schätzung; Speicherung.
- Neues Spiel: Spieler, Farben, Sitzreihenfolge, Sprecher, Varianten, Zusammenfassung.
- **Abnahme:** Ein Spiel mit 5 Spielern lässt sich anlegen; Einstellungen bleiben nach Neuladen erhalten.

### M3 Strategiephase

- Reihum wählen mit Timer, Raster mit 8 zweisprachigen Karten, zwei Durchgänge bei 3 bis 4 Spielern, optional Initiative 0 und Handelswaren-Hinweis.
- **Abnahme:** Eine Strategiephase liefert die richtige Aktionsreihenfolge; in Runde 2 beginnt wieder der Sprecher, nicht der Inhaber der Karte 1.

### M4 Aktionsphase

- Spielansicht mit Initiative-Leiste, Spielerfarbe, Zeit- und Bankanzeige, großem Weiter-Button.
- Taktisch, Primär/Sekundär, Passen, Undo/Redo, Pause.
- **Abnahme:** Eine komplette Aktionsphase mit 5 Spielern läuft ohne Blockade, inklusive Strategiekarte mit Sekundärphase.

### M5 Status- und Agendaphase

- Abfrage „Agendaphase aktiv?“ am Ende der Aktionsphase, Statusphase, Agenda mit zwei Abstimmungen (3:00 pro Spieler), Übergang zur nächsten Runde.
- **Abnahme:** Ein kompletter Rundenzyklus läuft durch; Abstimmungsreihenfolge stimmt; nach „Ja“ erscheint die Agendaphase dauerhaft.

### M6 Sonderfälle und Varianten

- Alle manuellen Eingriffe aus 5.4, Thunder's-Edge-Schalter, Naalu-Token.
- **Abnahme:** Jeder Eingriff ist per Undo rücknehmbar.

### M7 Persistenz und Spieleverwaltung

- Speichern nach jeder Aktion; die laufende Uhr wird aus `runningSince` rekonstruiert.
- Spieleliste, Fortsetzen, Beenden, Löschen, JSON-Export und -Import.
- **Abnahme:** Neuladen mitten im Zug lässt die Zeit korrekt weiterlaufen.

### M8 Warnungen, Ton und Wachhalten

- Farbwechsel bei 30 s und 10 s, Rot im Minus, Ton nach Start-Antippen, Wake Lock mit Hinweis.
- **Abnahme:** Am iPad kommt der Ton, und das Display bleibt 15 Minuten ohne Berührung an.

### M9 Gerätetest und Version 1.0

Testliste am iPad (Hoch- und Querformat, als Home-Bildschirm-App):

1. Ton nach Start-Antippen, auch bei Stummschalter geprüft.
2. Display bleibt 15 Minuten ohne Berührung an.
3. Zeit läuft nach App-Wechsel oder Sperren korrekt weiter.
4. Alle Schaltflächen sind gut treffbar.
5. App startet offline.
6. Probe mit 5 Spielern über eine volle Runde (Strategie, Aktion, Status, Agenda).
7. Nach einem Release erscheint die neue Version (Cache-Version erhöht).

**Abnahme:** Testliste abgehakt, bekannte Fehler behoben, Version 1.0 markiert.

### Danach (Version 1.x)

- Statistik pro Spieler, Runde und Phase; Export am Spielende
- Optionale gemeinsame Diskussionsuhr in der Agendaphase
- Reaktionsfenster und Handelsuhr
- Presets „Schnell“, „Standard“, „Entspannt“
- Spieler entfernen (Ausscheiden) mit Folgen für Sprecher und Token
- Optional: automatische Weitergabe bei leerer Bank

---

## 9. Arbeitsweise mit Claude Code

- **Entwicklungsort:** Windows-PC. Notwendig sind Node.js (LTS), Git und ein GitHub-Login. Für lokale Tests genügt ein einfacher Server; `localhost` zählt als sicherer Kontext. [A]
- **Mac:** Nur nötig, um Fehler am iPad per Safari-Web-Inspector und Kabel zu untersuchen. Alternative unter Windows: ein Konsolen-Overlay (zum Beispiel eruda hinter `?debug`).
- **Vorgehen:** Ein Meilenstein nach dem anderen; zuerst Logik mit Tests, dann Oberfläche. Jeder Schritt wird committet; ein Push auf `main` veröffentlicht automatisch über Pages.
- **Regelwissen:** Abschnitt 3 und 4 gehören in die `CLAUDE.md` des Projekts, damit sie in jeder Sitzung verfügbar sind.

---

## 10. Risiken

| Risiko | Gegenmaßnahme |
|---|---|
| Display geht aus oder kein Ton am iPad | Test in M8 und M9, Hinweis zur Auto-Sperre, visueller Alarm, Laptop als Fallback |
| Timer driftet im Hintergrund | Zeitstempel statt Ticks |
| Alte Version im Cache | Cache-Version bei jedem Release erhöhen, Update-Hinweis |
| Regelabweichungen (Thunder's Edge, Sonderkarten) | manuelle Eingriffe in M6, offene Regelpunkte vor dem Bau klären |
| Bedienung wird zu fummelig | großer Button, wenige Schritte, Undo/Redo, Test mit der Gruppe |
| Gutschrift wird ausgenutzt (kurze Züge) | Pass ohne Gutschrift, Bank-Obergrenze, optional Mindestzeit |
| Scope wächst | Liste „Version 1.x“, Meilenstein-Abnahmen |

---

## 11. Offene Punkte (vor dem Start zu klären)

**Vom Nutzer entschieden (6.11.):** Standard „Bank mit Gutschrift“ mit Pass ohne Gutschrift und Obergrenze 60:00; Hybrid mit frei einstellbaren Zeiten und „Nur Zeiten“ ohne Bank als weitere Optionen; ein Button „Sekundär abgeschlossen“ mit hochlaufender Anzeige ohne Limit; Überschreitung in Strategie- und Agendaphase rot mit Signalton sofort und nach 30 s Überzeit; deutsche Kartennamen (siehe 5.6); prominenter Pause-Button; iOS-Version ausreichend; GitHub-Konto Triseck01, App-Name Twilight Timer.

**Noch offen (für ein Spiel zu fünft kaum relevant):**

1. Reihenfolge des zweiten Wahldurchgangs bei 3 bis 4 Spielern.
2. Wortlaut der Karte „Gift of Prescience“ (Naalu).
3. Zeitfenster für Aktionskarten in der Agendaphase.
4. Gilt das Signal-Schema (Ton beim Umspringen auf Rot und nach 30 s Überzeit) auch in der Aktionsphase, sobald Zugzeit und Bank aufgebraucht sind? Im Entwurf: ja [A].

---

## 12. GitHub: was gebraucht wird

- Ein GitHub-Konto, in das du dich einloggen kannst, genügt als Grundlage.
- Für die Veröffentlichung wird ein **Repository** angelegt (zum Beispiel `ti4-timer`). Mit einem kostenlosen Konto funktioniert GitHub Pages nur bei einem **öffentlichen** Repository. Darin liegen keine Geheimnisse, nur die App.
- Festgelegt: GitHub-Benutzername **Triseck01** (`https://github.com/Triseck01`), App-Name **Twilight Timer**. Vorschlag für das Repository: `twilight-timer` [A]. Die App liegt dann unter `https://triseck01.github.io/twilight-timer/`.
- Zwei Wege, wie die Entwicklung auf das Repository kommt:
  1. **Auf deinem Windows-PC mit Claude Code:** Dort meldest du dich einmal bei GitHub an (`gh auth login`), und Claude Code legt das Repository an und pusht.
  2. **In dieser Sitzung:** Dafür muss GitHub in den claude.ai-Einstellungen verknüpft sein; ein leeres Repository legst du vorher selbst an, dann wird es dieser Sitzung hinzugefügt. In dieser Sitzung ist derzeit **kein GitHub-Konto verknüpft**.

---

## Quellen

- [Living Rules Reference (TI4)](https://ti4rules.github.io) und [Quick Reference](https://ti4rules.github.io/reference)
- [TI4-Regelzusammenfassung (scottmk)](https://scottmk.github.io/ti4-reference/rules-summary)
- [Prophecy of Kings Living Rules Reference, GitHub Gist](https://gist.github.com/OdinsPlasmaRifle/1e0ee0931c153b5df476f130d9a99796)
- [RulesPal: TI4-Regelbuch](https://rulespal.com/twilight-imperium-4/rulebook) und [Thunder's-Edge-Regelbuch](https://rulespal.com/twilight-imperium-fourth-edition-thunders-edge/rulebook)
- [Board Game Arena: TI4-Hilfe](https://en.doc.boardgamearena.com/Gamehelptwilightimperium)
- [Twilight Imperium Wiki: Thunder's Edge](https://twilight-imperium.fandom.com/wiki/Thunder's_Edge)
- [Fantasy Flight Games: Thunder's Edge](https://www.fantasyflightgames.com/en/news/2025/7/31/thunders-edge/)
- [gotimer.org: Multi-Player Turn Timer für Twilight Imperium](https://gotimer.org/board-games/multi-player-turn-timer/twilight-imperium?players=Player+1%2CPlayer+2%2CPlayer+3%2CPlayer+4&mode=hybrid&per_turn=90&bank=3600)
- Screenshots der App „TI Timer“ (vom Nutzer bereitgestellt)
- [radulle/chess-clock (MIT)](https://github.com/radulle/chess-clock)
