@echo off
cd /d "C:\Users\asrin\Desktop\trendenyol projesi"
npm run scheduler:run-once >> "%~dp0scheduled-scrape.log" 2>&1
