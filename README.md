# Phone Management

## 1) Tao du an Supabase

1. Vao https://supabase.com, tao account va tao project moi.
2. Vao **Table Editor** -> tao bang `devices`:

| Column | Type | Default |
| ------ | ---- | ------- |
| id | uuid | gen_random_uuid() |
| name | text | - |
| start_url | text | - |
| stop_url | text | - |
| status | text | 'idle' |
| created_at | timestamp | now() |

3. Bat RLS (Row Level Security) trong bang.
4. Tao policy cho `SELECT`, `INSERT`, `UPDATE`, `DELETE` cho public.
   - Cach nhanh: Table Editor -> Authentication -> Policies -> Add policy -> "Allow all".

## 2) Lay key va dán vao code

1. Vao **Project Settings** -> **API**.
2. Copy `Project URL` va `anon public key`.
3. Mo file `app.js` va thay:
   - `YOUR_SUPABASE_URL`
   - `YOUR_SUPABASE_ANON_KEY`
4. Mo `index.html`, them dong:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

Dat dong nay **truoc** `app.js`.

## 3) Chay web

Mo file `index.html` bang trinh duyet. Xong.

## 4) Chay local truoc (chua can Supabase)

- Ban co the mo web va them may, du lieu se luu trong trinh duyet.
- Khi nao co Supabase, chi can dien URL va KEY vao `app.js` la xong.

## 5) Chuyen Google Sheets -> JSON

1. Vao https://script.google.com -> New project.
2. Paste code trong web (muc "Code Apps Script").
3. Deploy -> New deployment -> Web app.
   - Execute as: Me
   - Who has access: Anyone
4. Copy link Web App (dang https://script.google.com/macros/s/.../exec) va dan vao web.
5. Nhap link Sheets, bam "Tao link JSON".

## 6) Note

Webhook chay/dung dung phuong thuc POST.

