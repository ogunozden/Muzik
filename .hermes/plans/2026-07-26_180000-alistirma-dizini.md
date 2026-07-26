# Alıştırma Dizini — Kökten Çözüm Planı

> **For Hermes:** Execute task-by-task. Her task bağımsız commit.

**Goal:** Gönül kitabındaki tüm nota örneklerini (alıştırmaları) taranabilir bir dizine dönüştürmek — makam, usul, form ve sayfa bazında.

**Mevcut:** `symb/` altında kitabın tam PDF'i (280 sayfa) ve PaddleOCR-VL markdown çıktısı (6022 satır) mevcut. OCR metin sayfalarını başarıyla çıkarmış, nota sayfaları resim olarak kalmış.

**Architecture:** 
1. OCR markdown'dan parça başlıklarını parse et → structured JSON index
2. pymupdf ile ilgili sayfaları PNG olarak render et → `public/exercises/` 
3. UI bileşeni: makam/usul filtresi + sayfa görüntüleyici
4. `/ogren` sekmesine "Alıştırmalar" sekmesi ekle

---
