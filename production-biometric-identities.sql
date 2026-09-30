/* CarsugForce - Asociacion inicial de biometricos desde codex_reference/attendance/pueba biometricos.xls
   Default seguro: @Apply = 0 solo muestra diagnostico. Cambia a 1 para insertar.

   Sucursales produccion:
   1 = Belisario
   2 = Santa Lucia
   3 = Almacen
*/

SET XACT_ABORT ON;

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRANSACTION;
END;

BEGIN TRANSACTION;

DECLARE @Apply bit = 0;
DECLARE @CreatedByUserId int = (SELECT TOP 1 [Id] FROM [Users] ORDER BY [Id]);
IF @CreatedByUserId IS NULL THROW 50000, 'No hay usuarios para CreatedByUserId.', 1;

DECLARE @Mappings table (
    SucursalesId int NOT NULL,
    Uen nvarchar(120) NOT NULL,
    EmployeeName nvarchar(240) NOT NULL,
    BiometricEmployeeCode nvarchar(80) NOT NULL,
    DeviceCode nvarchar(60) NOT NULL
);

INSERT INTO @Mappings (SucursalesId, Uen, EmployeeName, BiometricEmployeeCode, DeviceCode)
VALUES
    (3, N'ALMACEN', N'ALVARO CARDENAS MACIAS', N'220701', N'00000001'),
    (3, N'ALMACEN', N'JOSE FRANCISCO MEJIA RUIZ E.', N'221003', N'00000001'),
    (3, N'ALMACEN', N'ARTURO PEREZ ALVAREZ', N'240526', N'00000001'),
    (3, N'ALMACEN', N'RUBEN MARTINEZ MARQUEZ', N'240912', N'00000001'),
    (3, N'ALMACEN', N'CLAUDIA PALOMA MARTINEZ B', N'250504', N'00000001'),
    (3, N'ALMACEN', N'MIGUEL ANGEL ALVAREZ ELIAS', N'250511', N'00000001'),
    (3, N'ALMACEN', N'OMAR VAZQUEZ LUNA', N'250801', N'00000001'),
    (3, N'ALMACEN', N'JORGE ESPINOSA SANTOS', N'251021', N'00000001'),
    (3, N'ALMACEN', N'FERNANDO EMMANUEL AREVALO CRUZ', N'260113', N'00000001'),
    (3, N'ALMACEN', N'JOSE AARON VILLEGAS DIAZ', N'260331', N'00000001'),
    (3, N'ALMACEN', N'HUGO ALEJANDRO JAUREGUI ALVARADO', N'260422', N'00000001'),
    (3, N'ALMACEN', N'KEVIN E. VELAZCO MTZ', N'260528', N'00000001'),
    (3, N'ALMACEN', N'SAID OSWALDO LOZANO', N'260806', N'00000001'),
    (3, N'ALMACEN', N'LEONARDO DANIEL JAIME TORRES', N'260821', N'00000001'),
    (3, N'ALMACEN', N'LUIS TELLEZ', N'260907', N'00000001'),
    (1, N'BELISARIO', N'SALVADOR PEREA DAVILA', N'201109', N'00000005'),
    (1, N'BELISARIO', N'ESTEBAN OMAR LOZANO GARCIA', N'231022', N'00000005'),
    (1, N'BELISARIO', N'RICARDO ELIAS DAMASCO REYES', N'240414', N'00000001'),
    (1, N'BELISARIO', N'RICARDO ELIAS DAMASCO REYES', N'240414', N'00000005'),
    (1, N'BELISARIO', N'MILAGROS DEL ROSARIO GONZALEZ GARCIA', N'240813', N'00000005'),
    (1, N'BELISARIO', N'CHRISTIAN ALBERTO MUNIZ CASTILLO', N'250720', N'00000005'),
    (1, N'BELISARIO', N'ROSELIA ALAMO MARQUEZ', N'251011', N'00000005'),
    (1, N'BELISARIO', N'KARLA ALVAREZ PALOS', N'260101', N'00000005'),
    (1, N'BELISARIO', N'JESUS ALBERTO HERRADA AVILA', N'260109', N'00000005'),
    (1, N'BELISARIO', N'JESUS ISRAEL MORALES REYES', N'260125', N'00000005'),
    (1, N'BELISARIO', N'MARIA ANTONIA CARRILLO CERVANTES', N'260330', N'00000005'),
    (1, N'BELISARIO', N'FRANCISCO JAVIER MARTINEZ MARTINEZ', N'260420', N'00000005'),
    (1, N'BELISARIO', N'JOSE ANGEL HERNANDEZ PEREZ', N'260512', N'00000005'),
    (1, N'BELISARIO', N'MEREDITH N. ELIAS RDZ', N'260519', N'00000005'),
    (1, N'BELISARIO', N'JOSE REFUGIO GOMEZ', N'260607', N'00000005'),
    (1, N'BELISARIO', N'ALEX MONTOYA', N'260801', N'00000005'),
    (1, N'BELISARIO', N'LUPITA MAURICIO', N'260802', N'00000005'),
    (1, N'BELISARIO', N'JOSE ARTURO BARBOSA ESPARZA', N'260816', N'00000005'),
    (2, N'SANTA LUCIA', N'SALVADOR YOVAN TRISTAN TAMAYO', N'190226', N'00000002'),
    (2, N'SANTA LUCIA', N'ROBERTO ALAN SANCHEZ PEREZ', N'240625', N'00000002'),
    (2, N'SANTA LUCIA', N'DULCE VERONICA SALAS GONZALEZ', N'240901', N'00000002'),
    (2, N'SANTA LUCIA', N'JOSUE GUADALUPE RODRIGUEZ RAMIREZ', N'241020', N'00000002'),
    (2, N'SANTA LUCIA', N'ESCARLET ARIATNA PUCHETA', N'250914', N'00000002');

DECLARE @DeviceSucursalMap table (
    DeviceCode nvarchar(60) NOT NULL PRIMARY KEY,
    SucursalesId int NOT NULL,
    DeviceName nvarchar(120) NOT NULL
);

INSERT INTO @DeviceSucursalMap (DeviceCode, SucursalesId, DeviceName)
VALUES
    (N'00000001', 3, N'Dispositivo 00000001 - Almacen'),
    (N'00000002', 2, N'Dispositivo 00000002 - Santa Lucia'),
    (N'00000005', 1, N'Dispositivo 00000005 - Belisario');

IF EXISTS (
    SELECT 1
    FROM @Mappings m
    WHERE NOT EXISTS (SELECT 1 FROM [Sucursales] s WHERE s.[Id] = m.SucursalesId AND s.[IsActive] = 1)
)
    THROW 50001, 'Hay SucursalesId inexistentes o inactivos en @Mappings.', 1;

IF EXISTS (
    SELECT 1
    FROM @DeviceSucursalMap d
    WHERE NOT EXISTS (SELECT 1 FROM [Sucursales] s WHERE s.[Id] = d.SucursalesId AND s.[IsActive] = 1)
)
    THROW 50002, 'Hay SucursalesId inexistentes o inactivos en @DeviceSucursalMap.', 1;

INSERT INTO [BiometricDevices] ([Code], [Name], [SucursalesId], [IsActive], [CreatedAt], [CreatedByUserId])
SELECT d.DeviceCode, d.DeviceName, d.SucursalesId, CAST(1 AS bit), SYSUTCDATETIME(), @CreatedByUserId
FROM @DeviceSucursalMap d
WHERE NOT EXISTS (SELECT 1 FROM [BiometricDevices] bd WHERE bd.[Code] = d.DeviceCode);

UPDATE bd
SET
    bd.[Name] = d.DeviceName,
    bd.[SucursalesId] = d.SucursalesId,
    bd.[IsActive] = CAST(1 AS bit)
FROM [BiometricDevices] bd
INNER JOIN @DeviceSucursalMap d ON d.DeviceCode = bd.[Code]
WHERE ISNULL(bd.[SucursalesId], -1) <> d.SucursalesId
   OR bd.[Name] <> d.DeviceName
   OR bd.[IsActive] = 0;

DECLARE @Matched table (
    SucursalesId int NOT NULL,
    Uen nvarchar(120) NOT NULL,
    EmployeeName nvarchar(240) NOT NULL,
    BiometricEmployeeCode nvarchar(80) NOT NULL,
    DeviceCode nvarchar(60) NOT NULL,
    EmployeeId int NULL,
    MatchCount int NOT NULL
);

INSERT INTO @Matched (SucursalesId, Uen, EmployeeName, BiometricEmployeeCode, DeviceCode, EmployeeId, MatchCount)
SELECT
    src.SucursalesId,
    src.Uen,
    src.EmployeeName,
    src.BiometricEmployeeCode,
    src.DeviceCode,
    src.EmployeeId,
    COUNT(src.EmployeeId) OVER (PARTITION BY src.EmployeeName, src.BiometricEmployeeCode, src.DeviceCode) AS MatchCount
FROM (
    SELECT
        m.SucursalesId,
        m.Uen,
        m.EmployeeName,
        m.BiometricEmployeeCode,
        m.DeviceCode,
        e.[Id] AS EmployeeId
    FROM @Mappings m
    LEFT JOIN [HrEmployees] e
        ON UPPER(LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(CONCAT(e.[FirstName], N' ', e.[PaternalLastName], N' ', ISNULL(e.[MaternalLastName], N'')), N'  ', N' '), N'  ', N' '), N'  ', N' ')))) COLLATE Latin1_General_CI_AI
         = UPPER(m.EmployeeName) COLLATE Latin1_General_CI_AI
       AND e.[Status] = N'ACTIVE'
    LEFT JOIN [HrEmploymentPeriods] ep
        ON ep.[EmployeeId] = e.[Id]
       AND ep.[Status] = N'ACTIVE'
       AND ep.[SucursalesId] = m.SucursalesId
    WHERE e.[Id] IS NULL OR ep.[Id] IS NOT NULL
) src;

DECLARE @Ready table (
    SucursalesId int NOT NULL,
    Uen nvarchar(120) NOT NULL,
    EmployeeName nvarchar(240) NOT NULL,
    BiometricEmployeeCode nvarchar(80) NOT NULL,
    DeviceCode nvarchar(60) NOT NULL,
    EmployeeId int NOT NULL,
    MatchCount int NOT NULL,
    BiometricDeviceId int NOT NULL,
    DeviceSucursalesId int NULL
);

INSERT INTO @Ready (SucursalesId, Uen, EmployeeName, BiometricEmployeeCode, DeviceCode, EmployeeId, MatchCount, BiometricDeviceId, DeviceSucursalesId)
SELECT m.SucursalesId, m.Uen, m.EmployeeName, m.BiometricEmployeeCode, m.DeviceCode, m.EmployeeId, m.MatchCount, bd.[Id], bd.[SucursalesId]
FROM @Matched m
INNER JOIN [BiometricDevices] bd ON bd.[Code] = m.DeviceCode
WHERE m.EmployeeId IS NOT NULL AND m.MatchCount = 1;

DECLARE @Conflicts table (
    SucursalesId int NOT NULL,
    Uen nvarchar(120) NOT NULL,
    EmployeeName nvarchar(240) NOT NULL,
    BiometricEmployeeCode nvarchar(80) NOT NULL,
    DeviceCode nvarchar(60) NOT NULL,
    EmployeeId int NOT NULL,
    MatchCount int NOT NULL,
    BiometricDeviceId int NOT NULL,
    DeviceSucursalesId int NULL,
    ExistingEmployeeId int NOT NULL
);

INSERT INTO @Conflicts (SucursalesId, Uen, EmployeeName, BiometricEmployeeCode, DeviceCode, EmployeeId, MatchCount, BiometricDeviceId, DeviceSucursalesId, ExistingEmployeeId)
SELECT r.SucursalesId, r.Uen, r.EmployeeName, r.BiometricEmployeeCode, r.DeviceCode, r.EmployeeId, r.MatchCount, r.BiometricDeviceId, r.DeviceSucursalesId, existing.[EmployeeId]
FROM @Ready r
INNER JOIN [EmployeeBiometricIdentities] existing
    ON existing.[BiometricEmployeeCode] = r.BiometricEmployeeCode
   AND ISNULL(existing.[BiometricDeviceId], -1) = ISNULL(r.BiometricDeviceId, -1)
   AND existing.[IsActive] = 1
   AND existing.[EmployeeId] <> r.EmployeeId;

SELECT N'RESUMEN' AS Tipo,
    (SELECT COUNT(*) FROM @Mappings) AS RelacionesExcel,
    (SELECT COUNT(*) FROM @Ready) AS ListasParaInsertar,
    (SELECT COUNT(*) FROM @Conflicts) AS ConflictosCodigoDispositivo,
    (SELECT COUNT(*) FROM @Matched WHERE EmployeeId IS NULL) AS SinMatchEmpleado,
    (SELECT COUNT(*) FROM @Matched WHERE MatchCount > 1) AS MatchMultiple,
    (SELECT COUNT(*) FROM @Ready WHERE DeviceSucursalesId <> SucursalesId) AS DispositivoUenDiferente;

SELECT N'SIN_MATCH_EMPLEADO' AS Tipo, SucursalesId, Uen, EmployeeName, BiometricEmployeeCode, DeviceCode
FROM @Matched
WHERE EmployeeId IS NULL
ORDER BY SucursalesId, EmployeeName;

SELECT N'MATCH_MULTIPLE' AS Tipo, SucursalesId, Uen, EmployeeName, BiometricEmployeeCode, DeviceCode, EmployeeId
FROM @Matched
WHERE MatchCount > 1
ORDER BY SucursalesId, EmployeeName, EmployeeId;

SELECT N'CONFLICTO_CODIGO_DISPOSITIVO' AS Tipo, SucursalesId, Uen, EmployeeName, BiometricEmployeeCode, DeviceCode, EmployeeId, ExistingEmployeeId
FROM @Conflicts
ORDER BY SucursalesId, EmployeeName;

SELECT N'DISPOSITIVO_UEN_DIFERENTE' AS Tipo, SucursalesId AS EmpleadoSucursalesId, Uen, DeviceSucursalesId, EmployeeName, BiometricEmployeeCode, DeviceCode
FROM @Ready
WHERE DeviceSucursalesId <> SucursalesId
ORDER BY Uen, EmployeeName;

IF @Apply = 1
BEGIN
    INSERT INTO [EmployeeBiometricIdentities] ([EmployeeId], [BiometricDeviceId], [BiometricEmployeeCode], [IsActive], [CreatedByUserId], [CreatedAt])
    SELECT r.EmployeeId, r.BiometricDeviceId, r.BiometricEmployeeCode, CAST(1 AS bit), @CreatedByUserId, SYSUTCDATETIME()
    FROM @Ready r
    WHERE NOT EXISTS (
        SELECT 1
        FROM [EmployeeBiometricIdentities] existing
        WHERE existing.[EmployeeId] = r.EmployeeId
          AND existing.[BiometricEmployeeCode] = r.BiometricEmployeeCode
          AND ISNULL(existing.[BiometricDeviceId], -1) = ISNULL(r.BiometricDeviceId, -1)
          AND existing.[IsActive] = 1
    )
    AND NOT EXISTS (
        SELECT 1
        FROM @Conflicts c
        WHERE c.EmployeeId = r.EmployeeId
          AND c.BiometricEmployeeCode = r.BiometricEmployeeCode
          AND c.BiometricDeviceId = r.BiometricDeviceId
    );

    SELECT @@ROWCOUNT AS Insertadas;
    COMMIT TRANSACTION;
END
ELSE
BEGIN
    SELECT N'Vista previa solamente. Cambia @Apply a 1 para insertar.' AS Mensaje;
    ROLLBACK TRANSACTION;
END;
