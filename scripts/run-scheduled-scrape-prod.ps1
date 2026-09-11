# Production worker: local bilgisayardan (residential IP) production Supabase
# veritabanına yorum tarar. Kimlik bilgileri repo'ya asla girmez — .env.vercel
# (gitignored) dosyasından çalışma anında okunur. Windows Görev Zamanlayıcı
# "TrendyolYorumScraper" görevi bu script'i haftada bir çalıştırır (tetikleyiciyi
# değiştirmek için bkz. README.md "Scraper" bölümü).
Set-Location "C:\Users\asrin\Desktop\trendenyol projesi"

Get-Content ".env.vercel" | ForEach-Object {
    if ($_ -match '^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"?(.*?)"?\s*$') {
        [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
}

npm run scheduler:run-once *>> "scripts\scheduled-scrape.log"
