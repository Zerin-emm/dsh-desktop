; ============================================================================================
;  DSH Desktop Inno Setup 安装脚本 —— x64 版
;  编译： node scripts/package-inno.mjs <版本> <owner/repo> [--desktop-root 目录]
;         （或手动：ISCC.exe /D"BuildDir=…\dist\win-unpacked" … installer\dsh-desktop.iss）
;  前置： 上游已产出 dist\win-unpacked（node scripts/package.ts dir，或 yarn dist:win）
;  产物： dist\DSH-Desktop-Setup-<版本>-x64.exe，与 win-unpacked 同级
;  卸载： 程序目录与快捷方式一并清理；数据目录 %APPDATA%\DSH NEXT 由用户选择是否删除（默认保留）
;
;  这个脚本独立于上游仓库：它只读取 win-unpacked、只写出 dist 下的安装包，不改上游任何文件。
;  路径与版本全部由命令行 /D 注入，未注入时退回下面的占位值。
; ============================================================================================

#ifndef MyAppVersion
  #define MyAppVersion "0.0.0"
#endif
#ifndef MyAppUrl
  #define MyAppUrl "https://example.invalid/dsh-desktop"
#endif
#ifndef BuildDir
  #define BuildDir "..\upstream\dsh-desktop-next\dist\win-unpacked"
#endif
#ifndef OutputDir
  #define OutputDir "..\upstream\dsh-desktop-next\dist"
#endif
#ifndef SetupIconPath
  #define SetupIconPath "..\upstream\dsh-desktop-next\build\app-icon.ico"
#endif

#define MyAppName "DSH Desktop"
#define MyAppPublisher "DSH Desktop"
#define MyAppExeName "DSH Desktop.exe"
#define AppDataDir "{userappdata}\DSH NEXT"

[Setup]
; 应用身份，一旦发布永不修改，否则新版无法覆盖安装。
AppId={{F27A59B4-CA4D-484F-9166-E69DEDC5CF5A}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppUrl}
AppSupportURL={#MyAppUrl}
AppUpdatesURL={#MyAppUrl}/releases
DefaultDirName={localappdata}\Programs\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
; Electron 44 只支持 Windows 10 1809 及以上。
MinVersion=10.0.17763
OutputDir={#OutputDir}
OutputBaseFilename=DSH-Desktop-Setup-{#MyAppVersion}-x64
SetupIconFile={#SetupIconPath}
UninstallDisplayIcon={app}\{#MyAppExeName}
UninstallDisplayName={#MyAppName}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern dynamic windows11
; 覆盖安装时由重启管理器关闭旧实例；不要用 AppMutex。
CloseApplications=yes
CloseApplicationsFilter={#MyAppExeName}
RestartApplications=no
AllowNoIcons=yes

[Languages]
; 官方 Inno 安装包不带中文语言文件 —— 那是我本机装的「简体中文补丁」才有的东西，CI 的
; chocolatey 版一个都没有，所以第一次上 CI 就报 Couldn't open include file。
; 仓库自带一份 6.5.0+ 的官方译文，按「仓库 → 编译器自带 → 英文默认」三级降级，
; 任何环境都要能出包。
#if FileExists(AddBackslash(SourcePath) + "ChineseSimplified.isl")
  #define LangFile AddBackslash(SourcePath) + "ChineseSimplified.isl"
#elif FileExists(AddBackslash(CompilerPath) + "Languages\ChineseSimplified.isl")
  #define LangFile AddBackslash(CompilerPath) + "Languages\ChineseSimplified.isl"
#elif FileExists(AddBackslash(CompilerPath) + "Languages\Chinese.isl")
  #define LangFile AddBackslash(CompilerPath) + "Languages\Chinese.isl"
#else
  #define LangFile "compiler:Default.isl"
#endif
Name: "chinese"; MessagesFile: "{#LangFile}"

[Tasks]
Name: "desktopicon"; Description: "创建桌面快捷方式"; GroupDescription: "附加任务："; Flags: unchecked

[Files]
; win-unpacked 就是可运行的应用目录，原样整份打包。
Source: "{#BuildDir}\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "*.pdb,*.xml,*.map"

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
; 交互式安装：完成页上的复选框，用户勾了才启动。postinstall 条目在静默安装时不会被处理。
Filename: "{app}\{#MyAppExeName}"; Parameters: "--updated"; Description: "立即运行 {#MyAppName}"; Flags: nowait postinstall; Check: LaunchInteractive
; 静默更新：没有完成页，装完直接拉起新版本。
Filename: "{app}\{#MyAppExeName}"; Parameters: "--updated"; Flags: nowait; Check: LaunchSilentUpdate

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
const
  StartupRunKey = 'SOFTWARE\Microsoft\Windows\CurrentVersion\Run';
  StartupRunValueName = '{#MyAppName}';
  UpdateSwitch = '--updated';
  SilentRelaunch = '/SILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS --updated';

var
  DeleteUserData: Boolean;
  DataDirPath: String;
  AskUserDataAnswered: Boolean;
  IsUpdateRun: Boolean;

{ 命令行里是否带某个开关。 }
function HasSwitch(const Name: String): Boolean;
var
  I: Integer;
begin
  Result := False;
  for I := 1 to ParamCount do
  begin
    if CompareText(ParamStr(I), Name) = 0 then
    begin
      Result := True;
      Exit;
    end;
  end;
end;

procedure RemoveStartupEntry();
var
  ExistingValue: String;
begin
  if not RegQueryStringValue(HKCU, StartupRunKey, StartupRunValueName, ExistingValue) then
  begin
    Log('未找到自启动项，无需删除');
    Exit;
  end;
  if RegDeleteValue(HKCU, StartupRunKey, StartupRunValueName) then
    Log('已删除自启动项（原值：' + ExistingValue + '）')
  else
    Log('无法删除自启动项（原值：' + ExistingValue + '）');
end;

procedure AskAboutUserData();
begin
  if AskUserDataAnswered then Exit;
  AskUserDataAnswered := True;

  if not DirExists(DataDirPath) then
  begin
    DeleteUserData := False;
    Exit;
  end;

  { 静默卸载不问，保留数据。 }
  if UninstallSilent then
  begin
    DeleteUserData := False;
    Exit;
  end;

  DeleteUserData :=
    MsgBox('是否同时删除程序数据（设置与日志）？' + #13#10 + #13#10 +
           '数据目录：' + #13#10 + DataDirPath,
           mbConfirmation, MB_YESNO or MB_DEFBUTTON2) = IDYES;
end;

procedure RemoveUserData();
begin
  if not DeleteUserData then Exit;
  if not DirExists(DataDirPath) then Exit;
  if not DelTree(DataDirPath, True, True, True) then
    SuppressibleMsgBox('未能删除数据目录：' + #13#10 + DataDirPath + #13#10 + #13#10 +
                       '请手动删除该文件夹。', mbError, MB_OK, IDOK);
end;

{ 把收到的命令行写进 %APPDATA%，静默安装出问题时第一手资料就是这里。 }
procedure DumpCommandLine();
var
  I: Integer;
  Lines: TStringList;
begin
  Lines := TStringList.Create;
  try
    Lines.Add('ParamCount=' + IntToStr(ParamCount));
    for I := 1 to ParamCount do
      Lines.Add('[' + IntToStr(I) + ']=' + ParamStr(I));
    Lines.SaveToFile(ExpandConstant('{userappdata}') + '\dsh-setup-args.txt');
  finally
    Lines.Free;
  end;
end;

{ [Run] 的 Check 只接受函数名，所以每种启动条件各包一个函数置。 }
function LaunchInteractive(): Boolean;
begin
  Result := not WizardSilent;
end;

function LaunchSilentUpdate(): Boolean;
begin
  Result := WizardSilent and IsUpdateRun;
end;

function InitializeSetup(): Boolean;
var
  ResultCode: Integer;
  SetupPath: String;
begin
  IsUpdateRun := HasSwitch(UpdateSwitch);
  DumpCommandLine();
  if not IsUpdateRun then
  begin
    Result := True;
    Exit;
  end;

  { 已经是自举出来的静默实例，直接安装。 }
  if WizardSilent then
  begin
    Result := True;
    Exit;
  end;

  { 应用内更新沿用 NSIS 时代的调用约定（只传 --updated），而 Inno 的静默必须来自命令行开关。
     这里把自己以静默开关重新拉起，然后让当前实例退出，调用方看到的是一个静默安装。
     用 Exec 而不是 ShellExec：后者的 verb 传空串时对 exe 会失败，向导就会照常弹出来。 }
  SetupPath := ExpandConstant('{srcexe}');
  Log('检测到 --updated，自举为静默安装：' + SetupPath);
  if Exec(SetupPath, SilentRelaunch, '', SW_SHOWNORMAL, ewNoWait, ResultCode) then
  begin
    Log('静默实例已启动，退出当前实例');
    Result := False;
    Exit;
  end;
  Log('自举失败（错误码 ' + IntToStr(ResultCode) + '），继续交互式安装');
  Result := True;
end;

procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
begin
  if CurUninstallStep = usUninstall then
  begin
    DataDirPath := ExpandConstant('{#AppDataDir}');
    AskAboutUserData();
    RemoveStartupEntry();
  end
  else if CurUninstallStep = usPostUninstall then
  begin
    RemoveUserData();
  end;
end;
