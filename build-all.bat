@echo off
echo Building for all platforms...

dotnet publish steam-playtime-farmer/steam-playtime-farmer.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o ./release/win-x64
dotnet publish steam-playtime-farmer/steam-playtime-farmer.csproj -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true -o ./release/linux-x64
dotnet publish steam-playtime-farmer/steam-playtime-farmer.csproj -c Release -r linux-arm64 --self-contained true -p:PublishSingleFile=true -o ./release/linux-arm64
dotnet publish steam-playtime-farmer/steam-playtime-farmer.csproj -c Release -r osx-x64 --self-contained true -p:PublishSingleFile=true -o ./release/osx-x64
dotnet publish steam-playtime-farmer/steam-playtime-farmer.csproj -c Release -r osx-arm64 --self-contained true -p:PublishSingleFile=true -o ./release/osx-arm64

copy README.md release\win-x64\README.md
copy README.md release\linux-x64\README.md
copy README.md release\linux-arm64\README.md
copy README.md release\osx-x64\README.md
copy README.md release\osx-arm64\README.md

copy LICENSE release\win-x64\LICENSE
copy LICENSE release\linux-x64\LICENSE
copy LICENSE release\linux-arm64\LICENSE
copy LICENSE release\osx-x64\LICENSE
copy LICENSE release\osx-arm64\LICENSE

echo.
echo Creating zip archives...
powershell -Command "Compress-Archive -Path './release/win-x64/*' -DestinationPath './release/steam-playtime-farmer_win-x64.zip' -Force"
powershell -Command "Compress-Archive -Path './release/linux-x64/*' -DestinationPath './release/steam-playtime-farmer_linux-x64.zip' -Force"
powershell -Command "Compress-Archive -Path './release/linux-arm64/*' -DestinationPath './release/steam-playtime-farmer_linux-arm64.zip' -Force"
powershell -Command "Compress-Archive -Path './release/osx-x64/*' -DestinationPath './release/steam-playtime-farmer_osx-x64.zip' -Force"
powershell -Command "Compress-Archive -Path './release/osx-arm64/*' -DestinationPath './release/steam-playtime-farmer_osx-arm64.zip' -Force"

echo.
echo Done! Zip files are in ./release/
pause
