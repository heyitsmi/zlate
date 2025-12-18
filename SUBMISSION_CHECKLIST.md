# Extension Submission Checklist

## Pre-Submission

### Build Extension
```bash
cd extensions
npm run build
```

### Create ZIP Files
```bash
# Windows - di folder dist
# Klik kanan folder 'edge' → Send to → Compressed (zipped) folder
# Klik kanan folder 'firefox' → Send to → Compressed (zipped) folder

# Atau gunakan PowerShell:
cd extensions/dist
Compress-Archive -Path edge/* -DestinationPath zlate-edge.zip
Compress-Archive -Path firefox/* -DestinationPath zlate-firefox.zip
```

---

## Microsoft Edge Add-ons

### 1. Buat Akun Developer
- [ ] Buka https://partner.microsoft.com/dashboard/microsoftedge/overview
- [ ] Login dengan Microsoft account
- [ ] Lengkapi profil developer
- [ ] Bayar fee $19 USD (jika diperlukan)

### 2. Siapkan Assets
- [ ] ZIP file dari `dist/edge/` folder
- [ ] Icon 300x300 px (PNG)
- [ ] Screenshot 1280x800 atau 640x400 px (minimal 1, maksimal 10)
- [ ] Privacy Policy URL (host di website atau GitHub Pages)

### 3. Submit Extension
- [ ] Klik "Create new extension"
- [ ] Upload ZIP file
- [ ] Isi Store Listing:
  - [ ] Extension name: `Zlate - The Context-Aware AI Translator`
  - [ ] Short description (132 char max)
  - [ ] Full description
  - [ ] Category: `Productivity`
  - [ ] Upload screenshots
  - [ ] Upload store icon (300x300)
- [ ] Isi Privacy:
  - [ ] Privacy Policy URL
  - [ ] Centang permissions yang digunakan
- [ ] Isi Pricing: Free (dengan in-app purchase untuk Premium)
- [ ] Submit for certification

### 4. Review Process
- Biasanya 1-7 hari kerja
- Cek email untuk update status
- Jika ditolak, perbaiki sesuai feedback dan resubmit

---

## Mozilla Firefox Add-ons

### 1. Buat Akun Developer
- [ ] Buka https://addons.mozilla.org/developers/
- [ ] Login/register dengan Firefox account (gratis)
- [ ] Setujui Developer Agreement

### 2. Siapkan Assets
- [ ] ZIP file dari `dist/firefox/` folder
- [ ] Icon (sudah ada di manifest)
- [ ] Screenshot 1280x800 px (minimal 1)
- [ ] Privacy Policy URL

### 3. Submit Extension
- [ ] Klik "Submit a New Add-on"
- [ ] Pilih "On this site" untuk distribusi publik
- [ ] Upload ZIP file
- [ ] Pilih kategori: `Other` atau `Privacy & Security`
- [ ] Isi informasi:
  - [ ] Name: `Zlate - The Context-Aware AI Translator`
  - [ ] Summary (250 char max)
  - [ ] Description (lengkap)
  - [ ] Homepage URL
  - [ ] Support URL
  - [ ] License: MIT
- [ ] Upload screenshots
- [ ] Isi Privacy Policy URL
- [ ] Submit for review

### 4. Review Process
- Biasanya 1-3 hari
- Automated review + manual review
- Cek email untuk update status

---

## Post-Submission

### Setelah Approved
- [ ] Test extension dari store
- [ ] Update website dengan link store
- [ ] Announce di social media
- [ ] Monitor reviews dan feedback

### Maintenance
- [ ] Respond to user reviews
- [ ] Fix bugs yang dilaporkan
- [ ] Update extension secara berkala
- [ ] Increment version number untuk setiap update

---

## Version Update Checklist

Untuk update versi:

1. [ ] Update version di `src/manifest/base.json`
2. [ ] Update CHANGELOG (jika ada)
3. [ ] Build ulang: `npm run build`
4. [ ] Buat ZIP baru
5. [ ] Submit update di Partner Center (Edge) / Developer Hub (Firefox)
6. [ ] Tulis release notes

---

## Troubleshooting

### Edge Rejection Reasons
- Missing privacy policy
- Misleading description
- Broken functionality
- Security issues
- Excessive permissions

### Firefox Rejection Reasons
- Obfuscated code (tidak boleh)
- Missing source code (jika diminta)
- Privacy policy issues
- Broken functionality
- Unsafe practices

### Tips
- Pastikan semua fitur berfungsi sebelum submit
- Jangan gunakan obfuscator untuk Firefox
- Sediakan source code jika diminta
- Respond cepat ke reviewer feedback
