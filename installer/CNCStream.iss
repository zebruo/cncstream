#define AppName "CNCStream"
#define AppVersion "1.0.0"
#define AppPublisher "CNCStream"
#define AppExeName "CNCStream.exe"
#define AppId "{{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}"

[Setup]
AppId={#AppId}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher={#AppPublisher}
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
DisableProgramGroupPage=yes
OutputDir=output
OutputBaseFilename=CNCStream-Setup-{#AppVersion}
SetupIconFile=..\build\icon.ico
UninstallDisplayIcon={app}\{#AppExeName}
UninstallDisplayName={#AppName}
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin
VersionInfoVersion={#AppVersion}

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "Créer un raccourci sur le Bureau"; GroupDescription: "Raccourcis supplémentaires :"; Flags: unchecked

[Files]
Source: "..\dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#AppName}"; Filename: "{app}\{#AppExeName}"
Name: "{group}\Désinstaller {#AppName}"; Filename: "{uninstallexe}"
Name: "{userdesktop}\{#AppName}"; Filename: "{app}\{#AppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#AppExeName}"; Description: "Lancer {#AppName}"; Flags: nowait postinstall skipifsilent

[Code]
// Détecte et désinstalle silencieusement toute version précédente
procedure UninstallPreviousVersion();
var
  UninstallString: String;
  ResultCode: Integer;
begin
  // Cherche la clé de désinstallation dans le registre (64 bits)
  if not RegQueryStringValue(HKLM,
    'SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\{#AppId}_is1',
    'UninstallString', UninstallString) then
  begin
    // Fallback : registre 32 bits (WOW6432Node)
    RegQueryStringValue(HKLM,
      'SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\{#AppId}_is1',
      'UninstallString', UninstallString);
  end;

  if UninstallString <> '' then
  begin
    UninstallString := RemoveQuotes(UninstallString);
    // /SILENT : désinstallation sans fenêtre ni confirmation
    // /NORESTART : pas de redémarrage automatique
    Exec(UninstallString, '/SILENT /NORESTART', '', SW_HIDE,
      ewWaitUntilTerminated, ResultCode);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssInstall then
    UninstallPreviousVersion();
end;
