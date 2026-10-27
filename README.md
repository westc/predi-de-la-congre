# Territorios · La Villa

A free territory app for Congregación La Villa (Villa 1ro de Mayo, Santa Cruz).

- **The app** is a static page on GitHub Pages: https://westc.github.io/predi-de-la-congre/
- **The data** stays in a Google Sheet. The Sheet's Apps Script answers the app's requests.
- **The connection** between the two travels in a QR code that you get from the Sheet (**Territorios → Código QR de la app**). Scanning it opens the app already connected to your Sheet.

The page itself holds no data and no link to the Sheet, so it's fine for this repository to be public.

## What it does

- **Mapa:** manzanas colored by territory, or by how long since each was last worked.
  - Tap a manzana to see its history.
  - Tap an upcoming salida to see where it meets, get directions (**Cómo llegar**), or share it as a picture or as text (**Compartir**).
  - **◎** shows where you are; **Calles / Satélite** switches the background.
- **Informe:** mark each manzana of the day *Completo*, *Parcial* or *No se hizo*.
- **Planificar** (PIN): date and time, meeting point, conductor, manzanas with notes, and territories sorted by time without being worked.
- **Editar** (PIN): label manzanas, reshape them, add meeting points, lay the paper map over the streets.
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
6. **Deploy → Manage deployments**, click the pencil on your existing deployment, set *Version* to **New version**, and click **Deploy**.
   - Keep *Execute as* **Me** and *Who has access* **Anyone**. "Anyone with a Google account" would block the app.
   - Editing the existing deployment keeps its link, so old links and the Google Sites embed now show an **Abrir la app** button.

### 3. Get the QR code

1. Reload the Sheet. A **Territorios** menu appears (it can take a few seconds).
2. Choose **Territorios → Código QR de la app**.
   - The first time it may ask for the **web app URL**. Copy it from **Deploy → Manage deployments**; it ends in `/exec`.
3. Share the QR (right-click → copy image, print it), or use **Copiar enlace** to send the link.

### 4. Google Sites

Replace the old embed with a **Button** that links to the app link from the QR window. Embedding the app inside Sites works, but inside a frame, location and installing are blocked.

## Updating later

- **The page** (`index.html`, `manzanas.js`, …): push to GitHub. Phones pick up the new version the next time they open the app with signal. Bump `VERSION` in `index.html` (shown at the bottom of Editar) so you can confirm it.
  - If you change which files `sw.js` caches, also bump `APP` in `sw.js`.
- **The Apps Script** (`apps-script/`): paste the new files, then **Manage deployments → New version**.
  - Always edit the existing deployment. A brand-new deployment gets a new link, and everyone would need a new QR code.

New columns are added to the Sheet automatically the first time the app talks to it after an update.

## Things to know

- **The QR link is the key to the data.** Anyone with it can see the map, salidas, meeting points and conductors, and can send informes. Planning and editing need the PIN (Apps Script → Project Settings → Script properties → `ADMIN_PIN`). Share the QR only within the congregation.
- **Trying it without the Sheet:** open the page from `localhost`, or add `?demo` to the address. Data is then saved only in that browser, and the PIN is 1234.
- **iPhone note:** an app added to the home screen keeps its own storage. If it ever opens asking for the QR code, scan it once more.
- **Speed:** each trip to Google takes a couple of seconds. The app shows the saved copy at once and refreshes in the background, and map edits are sent together with **Guardar todo**.

Map data © OpenStreetMap contributors. Satellite imagery © Esri, Maxar, Earthstar Geographics.
