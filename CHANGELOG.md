# Changelog

What changed in each version of the app. The version is `VERSION` in `index.html`, shown at the bottom of **Más**.
**Apps Script** marks the versions that need the new `apps-script/Code.gs` pasted into the Sheet and deployed as a
**New version** (see README → *Updating later*); the others only need the push to GitHub.

## 43 · 03/11/2026
- Sharing the program as a picture sends a short message instead of listing every salida:
  *Hola, aquí está el programa de predicación del … al …*. It can be changed before sending.

## 42 · 03/11/2026 · Apps Script
- The app is called **Territorios**, so it can serve other congregations. The congregation's name is set in
  **Más → Congregación** (saved in the Sheet) and used on the printed program, the printed map and the messages.
- Links to the app show a preview when shared (WhatsApp, Telegram…): `og:` tags and `icons/og-image.jpg`.
- **Lugares:** an optional photo for each meeting point, sent with *Guardar todo*; 📷 in Lugares, on the map and in
  its salidas. New `fotoPunto` in `Code.gs` and a `foto` column in *Puntos* (added by itself).

## 40 · 03/11/2026
- The **📤 Recordar** reminder and the conductor's personal-link message use the formal *usted*.

## 39 · 03/11/2026
- **Calendario → 🖨** for everyone: the program for this week, next week, the month or chosen dates, printed (or PDF)
  or as a picture for WhatsApp.
- Date fields no longer stick out on phones.

## 38 · 03/11/2026 · Apps Script
- The conductor of a salida is chosen from the list of conductores (*Otro…* for someone not in it), so the app knows
  whose salida it is; names typed by hand before are marked *no está en la lista*.
- **📤 Recordar** next to missing informes: a message to the conductor with all their salidas still to report.
- **Lugares:** a meeting point's location from a Google Maps link or coordinates. Short links (`maps.app.goo.gl`) are
  followed by the new `enlace` in `Code.gs`, which needs the "external service" permission (run `setup` once).
- The tests live in `tests/` and run on GitHub on every push (**Actions → Pruebas**).

## 37 · 03/11/2026
- **Informe on the map:** tapping a manzana outlines it, lights up its row and opens a bubble to mark it; the map
  paints each one as it's marked.
- **Parcial** needs a note of what's left; the informe isn't sent without it.
- **Territorio:** *Colorear por Territorio | Manzana*; it always opens on the heat map.

## 35 · 02/11/2026
- Meeting points too close together keep a dot on their spot and their letters spread around them with a line, on
  the map and on the printed map.

## 34 · 02/11/2026
- **Lugares → Mapa para imprimir:** the territories with each meeting point's letter and a legend of the letters.

## 33 · 02/11/2026
- **Informe:** a conductor sees their own salidas first (*También las de otros* for the rest); reported salidas are
  folded under *Ya informadas*.
- A guided tour the first time (and from **Más → Cómo usar la app**), and **?** tips for each screen.

## 32 · 02/11/2026
- **Redesign.** Computer: sections in a sidebar, a panel whose width can be dragged, and the map always beside it.
  Phone: a tab bar at the bottom, and the map only on the screens that need it (its height dragged; ⤢ fills the
  screen). Sections: Inicio, Calendario, Lugares, Mapa, Informe, Planificar, Territorio, Más.

## 31 · 01/11/2026
- **Lugares de salida** for everyone: each place with its next salidas, *Cómo llegar* and *Compartir*.
- Phones could hide the map (Lista / Ambos / Mapa).

## 29 · 01/11/2026
- Calendars on Programa and Hoy, the program edited in place, and sorting in Registro.

## 28 · 30/10/2026
- The month's program is saved all at once (*Guardar todo* / *Descartar*); conductores can sign out.

## 27 · 30/10/2026 · Apps Script
- The monthly program and the *semana modelo*, printed or as a picture.
- A PIN for the siervo de territorios (everything but the conductores).
- Phones load only what changed since their last visit.

## 26 · 28/10/2026
- Larger text by default, and each phone chooses its text size.

## 25 · 28/10/2026
- Planificar: a bubble when hovering a manzana, and suggestions from one territory.

## 23 · 28/10/2026
- Suggestions can leave out territories never completed.

## 22 · 28/10/2026
- Missing informes reminded on Hoy, and suggested manzanas for a salida.

## 21 · 28/10/2026
- A *working…* overlay whenever the app loads from or saves to the Sheet.

## 20 · 28/10/2026
- Meeting points no longer used can be archived.

## 19 · 28/10/2026
- The printed S-13 shows the months its service year covers.

## 18 · 28/10/2026
- Areas for parts of the territory that are apart, with a switch on the map.

## 17 · 28/10/2026
- Anyone can open the history of a manzana or a territory.

## 16 · 28/10/2026
- A manzana left partial starts its next salida's note from what was left undone.

## 15 · 28/10/2026
- A heat map of how long each manzana has gone without being completed.

## 14 · 28/10/2026
- Reported salidas stop showing as upcoming, with how each manzana went.

## 13 · 28/10/2026 · Apps Script
- Conductores can correct a day's informes; a refresh button (↻).

## 12 · 27/10/2026 · Apps Script
- Houses that asked not to be visited, with an optional photo.

## 11 · 27/10/2026
- Which territories were completed most and least recently, and the printable S-13.

## 10 · 27/10/2026
- The app link can be shared as a QR code or a message.

## 8–9 · 27/10/2026
- Installable as an app (Chrome, Edge, Android, iPhone).

## 7 · 27/10/2026 · Apps Script
- Roles: publicador, conductor (personal link) and admin (PIN).

## 6 · 27/10/2026 · Apps Script
- First version: the territory map on GitHub Pages, with the data in a Google Sheet.
