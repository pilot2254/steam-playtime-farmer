@echo off
dotnet publish steam-playtime-farmer/steam-playtime-farmer.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o ./release/win-x64
dotnet publish steam-playtime-farmer/steam-playtime-farmer.csproj -c Release -r linux-x64 --self-contained true -p:PublishSingleFile=true -o ./release/linux-x64
dotnet publish steam-playtime-farmer/steam-playtime-farmer.csproj -c Release -r linux-arm64 --self-contained true -p:PublishSingleFile=true -o ./release/linux-arm64
dotnet publish steam-playtime-farmer/steam-playtime-farmer.csproj -c Release -r osx-x64 --self-contained true -p:PublishSingleFile=true -o ./release/osx-x64
dotnet publish steam-playtime-farmer/steam-playtime-farmer.csproj -c Release -r osx-arm64 --self-contained true -p:PublishSingleFile=true -o ./release/osx-arm64
echo Done!
pause
