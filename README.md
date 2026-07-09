# pp-tools

Independent online tool suite for browser-usable personal tools.

## Tools

- Delta Force Stats: upload screenshots and view a structured stats profile.
- Gesture Beauty Cam: run webcam effects directly in the browser.
- Sanpingfang Milk Tea: browse products, place orders, and manage the shop.

## Local Development

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

## Safety

- Keep secrets in environment variables.
- Do not commit local database files.
- Do not commit uploaded images.
- Review GitHub Desktop diffs before committing.
