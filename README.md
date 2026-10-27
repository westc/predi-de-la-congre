# Territorios · La Villa

A free territory app for Congregación La Villa (Villa 1ro de Mayo, Santa Cruz).

- **The app** is a static page on GitHub Pages: https://westc.github.io/predi-de-la-congre/
- **The data** stays in a Google Sheet. The Sheet's Apps Script answers the app's requests.
- **The connection** between the two travels in a QR code that you get from the Sheet (**Territorios → Código QR de la app**). Scanning it opens the app already connected to your Sheet.

The page itself holds no data and no link to the Sheet, so it's fine for this repository to be public.

## Who sees what

| | How they get in | What they see |
|---|---|---|
| **Publicador** | Scans the app's QR code (or opens its link) | **Hoy** only: today's salida with time, meeting point, **Cómo llegar**, and the manzanas to work, plus the next days |
| **Conductor** | Opens the personal link the admin sends them | **Hoy** + **Informe**: report what was done today or any earlier day. Reports carry their name automatically |
| **Admin** | Taps *Entrar como administrador* at the bottom of Hoy and enters the PIN | Everything: **Hoy**, **Informe**, **Planificar**, **Editar** (manzanas, meeting points, conductores, paper-map overlay) |

The Sheet enforces these rules, not only the page: without a conductor link or the PIN, the Sheet refuses informes and changes.

## What it does

- **Hoy:** big card(s) for today's salida, with **Cómo llegar** (Google Maps directions), **Ver en el mapa** and, in the salida's detail, **Compartir** (a picture or text to send). Today's manzanas are highlighted on the map. Tap any manzana to see when it was last worked; **◎** shows where you are; **Calles / Satélite** switches the background.
- **Informe** (conductor, admin): mark each manzana *Completo*, *Parcial* or *No se hizo*.
- **Planificar** (admin): date and time, meeting point, conductor, manzanas with notes; territories sorted by time without being worked, with the map colored by last work.
- **Editar** (admin): label and reshape manzanas, add meeting points, **Conductores** (create and send their links), lay the paper map over the streets.
- **Installable:**
  - Android Chrome shows **📲 Instalar la app** on the Mapa tab.
  - On iPhone: Share → **Agregar a inicio** (Add to Home Screen).
  - Either way it opens full-screen with its own icon.
- **Works with weak signal:**
  - The app opens from the phone's copy and shows the last data it downloaded.
  - Informes sent without signal are kept on the phone (a blue **"⏳ … espera señal"** bar) and go out by themselves when there's a connection.
  - Map tiles already seen are kept too.
  - Planning and editing still need a connection.

## Files

| Path | Goes to | What it is |
|---|---|---|
| `index.html` | GitHub Pages | The whole app |
| `manzanas.js` | GitHub Pages | The 106 manzanas pre-outlined from OpenStreetMap streets |
| `manifest.webmanifest`, `icons/` | GitHub Pages | What makes it installable |
| `sw.js` | GitHub Pages | Offline copy of the app and map tiles |
| `apps-script/Code.gs` | Apps Script | Reads and writes the Sheet, checks the PIN, adds the QR menu |
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
5. Save. Pick `setup` in the function dropdown and click **Run**, then approve the new permission (the Sheet menu and QR window need it).
   If you'd set `ADMIN_PIN` in Script properties before, it keeps working.
6. **Deploy → Manage deployments**, click the pencil on your existing deployment, set *Version* to **New version**, and click **Deploy**.
   - Keep *Execute as* **Me** and *Who has access* **Anyone**. "Anyone with a Google account" would block the app.
   - Editing the existing deployment keeps its link, so old links and the Google Sites embed now show an **Abrir la app** button.

### 3. Set the PIN and get the QR code

1. Reload the Sheet. A **Territorios** menu appears (it can take a few seconds).
2. Choose **Territorios → Cambiar PIN de administrador…** and type a PIN (at least 4 characters). You can change it there any time; admins then enter the new one.
3. Choose **Territorios → Código QR de la app**.
   - The first time it may ask for the **web app URL**. Copy it from **Deploy → Manage deployments**; it ends in `/exec`.
3. Share the QR (right-click → copy image, print it), or use **Copiar enlace** to send the link.

### 4. Give conductores their links

In the app, enter as admin → **Editar → Conductores**. Add each conductor by name, then **Enviar enlace**: show them the QR, or send it by WhatsApp. Opening that link once is enough; the phone remembers it.

If a link reaches the wrong person, **Desactivar** it (or **Borrar** it) and add the conductor again to get a new link. Their past informes stay.

### 5. Google Sites

Replace the old embed with a **Button** that links to the app link from the QR window. Embedding the app inside Sites works, but inside a frame, location and installing are blocked.

## Updating later

- **The page** (`index.html`, `manzanas.js`, …): push to GitHub. Phones pick up the new version the next time they open the app with signal. Bump `VERSION` in `index.html` (shown at the bottom of Editar) so you can confirm it.
  - If you change which files `sw.js` caches, also bump `APP` in `sw.js`.
- **The Apps Script** (`apps-script/`): paste the new files, then **Manage deployments → New version**.
  - Always edit the existing deployment. A brand-new deployment gets a new link, and everyone would need a new QR code.

New columns are added to the Sheet automatically the first time the app talks to it after an update.

## Things to know

- **The QR link is the key to the data.** Anyone with it can see the map, salidas, meeting points, conductor names and past informes. Share the QR only within the congregation.
- **Conductor links are personal.** The secret part of each one is in the *Conductores* sheet (`clave` column); only the admin's app ever receives it.
- **The PIN** is stored in the script's properties (set from the Sheet menu). After 10 wrong tries the Sheet refuses the PIN for 15 minutes. The admin's phone or computer remembers the PIN until **Salir**.
- **Trying it without the Sheet:** open the page from `localhost`, or add `?demo` to the address. Data is then saved only in that browser, and the admin PIN is 1234.
- **iPhone note:** an app added to the home screen keeps its own storage. If it ever opens asking for the QR code, scan it once more.
- **Speed:** each trip to Google takes a couple of seconds. The app shows the saved copy at once and refreshes in the background, and map edits are sent together with **Guardar todo**.

Map data © OpenStreetMap contributors. Satellite imagery © Esri, Maxar, Earthstar Geographics.
