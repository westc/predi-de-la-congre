# Territorios · La Villa

A free territory app for Congregación La Villa (Villa 1ro de Mayo, Santa Cruz).

- **The app** is a static page on GitHub Pages: https://westc.github.io/predi-de-la-congre/
- **The data** stays in a Google Sheet. The Sheet's Apps Script answers the app's requests.
- **The connection** between the two travels in a QR code that you get from the Sheet (**Territorios → Código QR de la app**). Scanning it opens the app already connected to your Sheet.

The page itself holds no data and no link to the Sheet, so it's fine for this repository to be public.

## Who sees what

| | How they get in | Sections |
|---|---|---|
| **Publicador** | Scans the app's QR code (or opens its link) | **Inicio**, **Calendario**, **Lugares**, **Mapa** (phones), **Más**: today's salida with time, meeting point, **Cómo llegar** and the manzanas to work, the program, the meeting points, and the houses that asked not to be visited |
| **Conductor** | Opens the personal link the superintendente sends them | The same plus **Informe**: report what was done today or any earlier day. Reports carry their name automatically. They can also register houses that asked not to be visited. **Más → Salir** shows the app as a publicador sees it; the phone remembers them, so **Entrar como conductor** (in Más) brings them back without the link (opening the app from the home screen doesn't sign them back in by itself) |
| **Siervo de territorios** | **Más → Entrar con PIN**, with the siervo's PIN | Everything except the conductores: **Inicio**, **Calendario** (editable), **Informe**, **Planificar**, **Territorio** (with **Editar mapa**), **Lugares** (editable). Sees the conductores' names, never the secret in their links |
| **Superintendente de servicio** | **Más → Entrar con PIN**, with the superintendente's PIN | Everything, including **Más → Conductores** (create them, send their links, turn them off). Only the superintendente manages the conductores |

The Sheet enforces these rules, not only the page: without a conductor link or a PIN, the Sheet refuses informes and changes, and only the superintendente's PIN can change the conductores. Each PIN is set only from the Sheet's menu.

## How it's laid out

- **On a computer:** the sections in a bar on the left, the screen next to it, and the map always on the right. Drag the line between the screen and the map to make the screen wider or narrower (double-click it for the usual width); each computer remembers it.
- **On a phone:** a tab bar at the bottom with five sections; the others are in **Más**. The map shows above the screen only where it's needed (a salida, Informe, choosing manzanas, Territorio, a history, a house not to visit, editing a place). Drag the bar under the map to make it taller or shorter (each phone remembers it); **⤢** on the map makes it fill the screen. **Mapa** is the map on its own.
  - Phones: Publicador Inicio · Calendario · Lugares · Mapa · Más; Conductor Inicio · Calendario · Informe · Mapa · Más; Superintendente and siervo Inicio · Calendario · Planificar · Territorio · Más.
- **‹** (top left) goes back from a screen opened over a section (a salida, a history, the Planificar editor, Editar mapa, Conductores, Semana modelo…). Tapping a section's tab again goes back to its start.

## What it does

- **Inicio:** missing informes on top, then big card(s) for today's salida, with **Cómo llegar** (Google Maps directions), **Ver en el mapa** and, in the salida's screen, **Compartir** (a picture or text to send). Below, the next few days, and a link to the Calendario.
  - Once every manzana of a salida has an informe, it stops being shown as the upcoming salida. It moves to **Ya informadas hoy**, where each manzana shows how it went: ✓ completo (green), ◐ parcial with its % (orange), ✕ no se hizo (red). The map colors those manzanas the same way, with the same symbol. If all of today's salidas are reported, the next salida takes the big card. Tap any manzana on the map to see when it was last worked; **◎** shows where you are; **Calles / Satélite** switches the background.
- **Calendario (everyone):** the month's program as a **Lista** (from today on) or a **Mes** grid (any month; tap a time to open that salida, or a day to list its salidas).
  - For the superintendente and the siervo it's also where the program is made: day, time, place (a meeting point), group, conductor and a detail. Each salida's time in the grid is green with manzanas, orange without, gray if sin territorio, outlined if especial. Tapping a salida opens its form right where it is (with **🗺 Manzanas** to choose them in Planificar); **+ salida** next to a day (or tapping a day in the grid) adds one that day.
  - Changes collect as **cambios sin guardar** (the orange bar), so a whole month can be worked on and then saved with **Guardar todo**, or dropped with **Descartar**. If the siervo chose manzanas for a salida in the meantime, saving keeps them.
  - Mark a salida **sin territorio** (Predicación Pública, por carta, a trip) so no manzanas are asked for it and it never shows as a missing informe, or **arreglo especial (\*\*)**.
  - **Semana modelo:** the usual week, set once (its own screen). **+ N de la semana modelo** fills the month with it (from today on, without repeating what's there; the button only shows while there's something to add); then change conductors or add the special salidas.
  - **🖨** gives the program page (or PDF) and **📤** a picture and text of it for WhatsApp.
- **Lugares (everyone):** each meeting point with the next salidas from there (day, time, group, conductor; tap to open), **Cómo llegar**, **Ver en el mapa**, and **Compartir**, which sends the place's Google Maps location and its next salidas (WhatsApp, share sheet, copy, or a QR code). Tapping a meeting point on the map shows the same.
  - The superintendente and the siervo add places here (**+ Agregar lugar**, then tap the map), and **Editar** one to rename it, move it (drag it on the map), **Archivar** it or remove it. An archived place leaves the map and the Planificar list, but salidas that already use it keep its name and Cómo llegar; **Archivados** lists them to **Restaurar**. Saved in the Config sheet.
- **History (everyone):** tapping a manzana on the map offers **📜 Historial** and **📜 Territorio N**:
  - **Manzana:** when it was last completed, partial work since, upcoming salidas with their notes, houses not to visit, and every informe by year, with who reported or changed it.
  - **Territorio:** its state, each manzana (tap one for its history), every round from assigned to completed and by whom, and all its informes by year.
  - The manzana names in Planificar and Informe, and the territories in Territorio, open the same screens.
- **Faltan informes:** salidas from the last 45 days with manzanas nobody reported show at the top of Inicio, with **Informar**, and as a number on the Informe tab (on Inicio for those whose tab bar has no Informe). A conductor sees their own salidas (matched by name); the admin sees everyone's.
- **Informe** (conductor, admin): mark each manzana *Completo*, *Parcial* or *No se hizo*.
  - What was already reported for that day shows up marked, and any conductor or admin can correct it. Tapping the marked state again deletes that informe.
  - There is one informe per manzana per day. A correction keeps who reported it first and adds who changed it (*editadoPor*, *editado* in the Sheet).
- **↻** (top right) brings in the latest data from the Sheet. The app also does it by itself when it comes back to the screen after a minute, and when you open Informe. Pulling the page down doesn't reload the app.
- **No visitar** (houses that asked not to be visited):
  - Conductores and the admin register them from **Más → Registrar casa que no se visita** (or tap a manzana on the map) with the manzana, a required address or description, and an optional photo.
  - The photo is shrunk on the phone to at most 120 KB before it's sent.
  - Everyone sees them: a 🚫 on the manzana in the map, in the manzana's details, in the salida cards and in Informe. **Compartir** includes them in the text and picture.
  - The admin edits or deletes them from **Territorio → Casas que no se visitan**. Conductores can only add.
- **Planificar** (superintendente, siervo): first the list of upcoming salidas, **Faltan manzanas** on top (salidas from the program that still need them), then those that have them, and the last 3 weeks with how each manzana went. Tapping one (or **+ Nueva salida**) opens the editor with the map: date and time, meeting point, conductor (folded away for a salida from the program), and the manzanas, each with a note. Tap manzanas on the map, or a territory's big number to take it whole; **Territorios por tiempo sin trabajar** lists the territories by their manzana that has gone longest without being completed.
  - **✨ Sugerir** proposes the chosen number of manzanas longest without being completed, close together and close to the meeting point (it updates when the point changes, until the selection is changed by hand). It skips manzanas completed in the last 3 weeks and those already in an upcoming salida; **Otra sugerencia** gives different ones. In **Cómo sugiere**: **Sin territorios nunca completados** (remembered on each phone) leaves out territories with no completed round yet; **Solo un territorio** (also remembered) suggests one territory, the one longest without being completed, starting with the manzanas it still needs; if more manzanas are asked for than it has free, it goes on to the nearest territory (recently done manzanas included).
  - On a computer, hovering a manzana shows a bubble with how it stands and buttons to add or remove it, open its history or its territory's; it stays while the mouse is on it. **Colorear por → Último trabajo** turns the map into a heat map of the manzanas, from light (completed recently) to dark (longest ago), gray if never completed, with ◐ on those with partial work since.
- **Territorio** (superintendente, siervo): which territories were completed most and least recently, as a heat map and a list (sorted by **Más atrasados**, **Número** or **Más recientes**, remembered on each phone; tap one for its history), the **S-13** (*Registro de asignación de territorio*) for any service year, ready to print or save as PDF, and the houses not to visit.
  - A territory is **completed** on the day the last of its manzanas gets a *Completo* informe (*Parcial* doesn't count).
  - It counts as **assigned** from the first salida (or informe) that includes it after its previous completion. *Asignado a* lists that round's conductores.
  - Nothing new is entered for this: it all comes from the salidas and informes.
  - **Editar mapa:** label and reshape manzanas (and the territories' colors), the **Áreas**, and the **Imagen guía** (the paper map laid over the streets, only on that device).
  - **Áreas:** for parts of the territory that are apart (e.g. an isolated territory in another neighborhood). The main area starts as "Territorios"; add others and assign territories to them. With two or more areas that have manzanas, the map gets a switch to jump between them (for everyone), and the app opens on the area last chosen. Saved in the Config sheet, so no Apps Script change was needed.
- **Más (everyone):** who you are, **Entrar con PIN** / **Salir**, the sections that aren't in the phone's tab bar, **Registrar casa que no se visita**, **Conductores** (superintendente), **Compartir la app**, how to install it, the version, and **Tamaño de letra**: **A− / A+** chooses Pequeña, Normal (default), Grande or Muy grande; each phone remembers it. It's needed because an iPhone's own text size doesn't reach web apps, and an app added to the home screen has no zoom button. The printed S-13 keeps its size.
- **Installable:**
  - Android Chrome: **Más → 📲 Instalar la app**.
  - On iPhone: Share → **Agregar a inicio** (Add to Home Screen).
  - Either way it opens full-screen with its own icon.
- **Works with weak signal:**
  - The app opens from the phone's copy and shows the last data it downloaded.
  - Informes and *No visitar* houses sent without signal are kept on the phone (a blue **"⏳ … espera señal"** bar) and go out by themselves when there's a connection.
  - A house's photo, once seen, is kept on the phone too.
  - Map tiles already seen are kept too.
  - Planning and editing still need a connection.

## Files

| Path | Goes to | What it is |
|---|---|---|
| `index.html` | GitHub Pages | The whole app |
| `manzanas.js` | GitHub Pages | The 106 manzanas pre-outlined from OpenStreetMap streets |
| `manifest.webmanifest`, `icons/` | GitHub Pages | What makes it installable |
| `sw.js` | GitHub Pages | Offline copy of the app and map tiles |
| `apps-script/Code.gs` | Apps Script | Reads and writes the Sheet, checks the PIN, adds the QR menu. Photos of houses are kept in the *Fotos* sheet in pieces, since a cell holds at most 50,000 characters |
| `apps-script/Qr.html` | Apps Script | The QR code window |

## Setup

### 1. Publish the page (GitHub)

1. Create a **public** repository named `predi-de-la-congre` under `westc`, and push this folder to it.
2. In the repository, go to **Settings → Pages**. Under *Source* choose **Deploy from a branch**, then **main** and **/ (root)**, and click Save.
3. After a minute the page is live at https://westc.github.io/predi-de-la-congre/. Opened like that, it asks for the QR code; that's expected.

### 2. Update the Apps Script (in your existing Sheet)

1. Open the Sheet → **Extensions → Apps Script**.
2. Replace everything in `Code.gs` with `apps-script/Code.gs`.
3. Click **+ → HTML** and name it `Qr`. Paste `apps-script/Qr.html` into it.
4. Delete the old `Index` and `Manzanas` files; they now live on GitHub Pages.
5. Save. Pick `setup` in the function dropdown and click **Run**, then approve the permissions it asks for. `setup` also installs the trigger that notices changes made by hand in the Sheet (see *Speed* below); run it again after updating the script.
   If you'd set `ADMIN_PIN` in Script properties before, it keeps working.
6. **Deploy → Manage deployments**, click the pencil on your existing deployment, set *Version* to **New version**, and click **Deploy**.
   - Keep *Execute as* **Me** and *Who has access* **Anyone**. "Anyone with a Google account" would block the app.
   - Editing the existing deployment keeps its link, so old links and the Google Sites embed now show an **Abrir la app** button.

### 3. Set the PIN and get the QR code

1. Reload the Sheet. A **Territorios** menu appears (it can take a few seconds).
2. Choose **Territorios → Cambiar PIN del superintendente de servicio…** and type a PIN (at least 4 characters), then **Cambiar PIN del siervo de territorios…** for his, a different one. They can be changed there any time; whoever had entered with the old one enters again.
3. Choose **Territorios → Código QR de la app**.
   - The first time it may ask for the **web app URL**. Copy it from **Deploy → Manage deployments**; it ends in `/exec`.
3. Share the QR (right-click → copy image, print it), or use **Copiar enlace** to send the link.

### 4. Give conductores their links

In the app, enter as superintendente → **Más → Conductores**. Add each conductor by name, then **Enviar enlace**: show them the QR, or send it by WhatsApp. Opening that link once is enough; the phone remembers it.

If a link reaches the wrong person, **Desactivar** it (or **Borrar** it) and add the conductor again to get a new link. Their past informes stay.

### 5. Google Sites

Replace the old embed with a **Button** that links to the app link from the QR window. Embedding the app inside Sites works, but inside a frame, location and installing are blocked.

## Updating later

- **The page** (`index.html`, `manzanas.js`, …): push to GitHub. Phones pick up the new version the next time they open the app with signal. Bump `VERSION` in `index.html` (shown at the bottom of Más) so you can confirm it.
  - If you change which files `sw.js` caches, also bump `APP` in `sw.js`.
- **The Apps Script** (`apps-script/`): paste the new files, then **Manage deployments → New version**.
  - Always edit the existing deployment. A brand-new deployment gets a new link, and everyone would need a new QR code.

New columns are added to the Sheet automatically the first time the app talks to it after an update.

## Things to know

- **The QR link is the key to the data.** Anyone with it can see the map, salidas, meeting points, conductor names, past informes, and the houses not to visit with their photos. Share the QR only within the congregation.
- **Conductor links are personal.** The secret part of each one is in the *Conductores* sheet (`clave` column); only the admin's app ever receives it.
- **The PINs** are stored in the script's properties (set from the Sheet menu). After 10 wrong tries the Sheet refuses PINs for 15 minutes. A phone or computer remembers the PIN until **Salir**.
- **Trying it without the Sheet:** open the page from `localhost`, or add `?demo` to the address. Data is then saved only in that browser, and the admin PIN is 1234.
- **iPhone note:** an app added to the home screen keeps its own storage. If it ever opens asking for the QR code, scan it once more.
- **Speed:** each trip to Google takes a couple of seconds, so the app sends as little as it can.
  - Every change made through the app gets a version number and a row in the hidden **Cambios** sheet. A phone remembers which version it has and asks only for what changed since ("Buscando cambios…"), and a change it sends comes back with only what changed. Once a week, and whenever someone else logs in on that phone, it loads everything again.
  - The script keeps a ready copy of all the data (for each kind of user), so a full load usually doesn't read the sheets.
  - **Editing the Sheet by hand is fine:** the trigger that `setup` installs notices it, and every phone then loads everything again. If `setup` wasn't run after updating the script, hand edits only reach phones on their weekly full load. Don't edit or delete the hidden **Cambios** sheet.
  - Map edits are sent together with **Guardar todo**.

Map data © OpenStreetMap contributors. Satellite imagery © Esri, Maxar, Earthstar Geographics.
