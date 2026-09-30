/* CarsugForce - Produccion HR/Asistencia
   Ejecutar en la BD de produccion.
   No inserta empleados ni datos operativos de empleados.
*/

SET XACT_ABORT ON;
BEGIN TRANSACTION;

DECLARE @now datetime2 = SYSUTCDATETIME();

/* 1) Cambios recientes en expediente */
IF OBJECT_ID(N'[HrEmployeePhotos]', N'U') IS NULL
BEGIN
    CREATE TABLE [HrEmployeePhotos] (
        [Id] int NOT NULL IDENTITY,
        [EmployeeId] int NOT NULL,
        [OriginalFileName] nvarchar(260) NOT NULL,
        [StoredFileName] nvarchar(260) NOT NULL,
        [BlobName] nvarchar(600) NOT NULL,
        [ContentType] nvarchar(150) NOT NULL,
        [SizeBytes] bigint NOT NULL,
        [IsCurrent] bit NOT NULL,
        [IsDeleted] bit NOT NULL,
        [UploadedByUserId] int NOT NULL,
        [UploadedAt] datetime2 NOT NULL,
        [DeletedByUserId] int NULL,
        [DeletedAt] datetime2 NULL,
        CONSTRAINT [PK_HrEmployeePhotos] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_HrEmployeePhotos_HrEmployees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [HrEmployees] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_HrEmployeePhotos_Users_UploadedByUserId] FOREIGN KEY ([UploadedByUserId]) REFERENCES [Users] ([Id]),
        CONSTRAINT [FK_HrEmployeePhotos_Users_DeletedByUserId] FOREIGN KEY ([DeletedByUserId]) REFERENCES [Users] ([Id])
    );

    CREATE INDEX [IX_HrEmployeePhotos_UploadedByUserId] ON [HrEmployeePhotos] ([UploadedByUserId]);
    CREATE INDEX [IX_HrEmployeePhotos_DeletedByUserId] ON [HrEmployeePhotos] ([DeletedByUserId]);
    CREATE UNIQUE INDEX [IX_HrEmployeePhotos_EmployeeId_IsCurrent]
        ON [HrEmployeePhotos] ([EmployeeId], [IsCurrent])
        WHERE [IsCurrent] = 1 AND [IsDeleted] = 0;
END;

IF COL_LENGTH('HrEmployees', 'BirthDate') IS NULL
BEGIN
    ALTER TABLE [HrEmployees] ADD [BirthDate] date NULL;
END;

IF COL_LENGTH('HrEmployees', 'EmergencyContactRelationship') IS NULL
BEGIN
    ALTER TABLE [HrEmployees] ADD [EmergencyContactRelationship] nvarchar(80) NULL;
END;

/* 2) Catalogo de puestos */
DECLARE @Positions table ([Name] nvarchar(160) NOT NULL);
INSERT INTO @Positions ([Name])
VALUES
    (N'DIRECTOR'),
    (N'GERENTE'),
    (N'ESPECIALISTA'),
    (N'ANALISTA'),
    (N'JEFE OPERACION'),
    (N'AUX. OPERACION'),
    (N'AP. OPERACION'),
    (N'CAJERO'),
    (N'MOE'),
    (N'CARNICERO AA'),
    (N'CARNICERO A'),
    (N'CARNICERO B'),
    (N'CARNICERO C'),
    (N'REPARTIDOR');

INSERT INTO [HrPositions] ([Name], [IsActive], [CreatedAt], [CreatedByUserId])
SELECT p.[Name], CAST(1 AS bit), @now, NULL
FROM @Positions p
WHERE NOT EXISTS (
    SELECT 1 FROM [HrPositions] hp WHERE hp.[Name] = p.[Name]
);

/* 3) Tablas de planeacion, biometricos e incidencias */
IF OBJECT_ID(N'[WorkSchedules]', N'U') IS NULL
BEGIN
    CREATE TABLE [WorkSchedules] (
        [Id] int NOT NULL IDENTITY,
        [Name] nvarchar(120) NOT NULL,
        [StartTime] time NOT NULL,
        [EndTime] time NOT NULL,
        [BreakMinutes] int NOT NULL,
        [IsActive] bit NOT NULL CONSTRAINT [DF_WorkSchedules_IsActive] DEFAULT 1,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedByUserId] int NULL,
        [UpdatedAt] datetime2 NULL,
        [UpdatedByUserId] int NULL,
        CONSTRAINT [PK_WorkSchedules] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_WorkSchedules_Name] ON [WorkSchedules] ([Name]);
END;

IF OBJECT_ID(N'[EmployeeWorkSchedules]', N'U') IS NULL
BEGIN
    CREATE TABLE [EmployeeWorkSchedules] (
        [Id] int NOT NULL IDENTITY,
        [EmployeeId] int NOT NULL,
        [WorkScheduleId] int NOT NULL,
        [EffectiveFrom] datetime2 NOT NULL,
        [EffectiveTo] datetime2 NULL,
        [IsActive] bit NOT NULL CONSTRAINT [DF_EmployeeWorkSchedules_IsActive] DEFAULT 1,
        [CreatedByUserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_EmployeeWorkSchedules] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EmployeeWorkSchedules_HrEmployees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [HrEmployees] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_EmployeeWorkSchedules_WorkSchedules_WorkScheduleId] FOREIGN KEY ([WorkScheduleId]) REFERENCES [WorkSchedules] ([Id])
    );
    CREATE INDEX [IX_EmployeeWorkSchedules_EmployeeId_IsActive] ON [EmployeeWorkSchedules] ([EmployeeId], [IsActive]);
END;

IF OBJECT_ID(N'[EmployeeWeeklySchedules]', N'U') IS NULL
BEGIN
    CREATE TABLE [EmployeeWeeklySchedules] (
        [Id] int NOT NULL IDENTITY,
        [EmployeeId] int NOT NULL,
        [Year] int NOT NULL,
        [Week] int NOT NULL,
        [WorkScheduleId] int NULL,
        [RestDayOfWeek] int NULL,
        [CreatedByUserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedByUserId] int NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_EmployeeWeeklySchedules] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EmployeeWeeklySchedules_HrEmployees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [HrEmployees] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_EmployeeWeeklySchedules_WorkSchedules_WorkScheduleId] FOREIGN KEY ([WorkScheduleId]) REFERENCES [WorkSchedules] ([Id])
    );
    CREATE UNIQUE INDEX [IX_EmployeeWeeklySchedules_EmployeeId_Year_Week] ON [EmployeeWeeklySchedules] ([EmployeeId], [Year], [Week]);
END;

IF OBJECT_ID(N'[EmployeeDailySchedules]', N'U') IS NULL
BEGIN
    CREATE TABLE [EmployeeDailySchedules] (
        [Id] int NOT NULL IDENTITY,
        [EmployeeId] int NOT NULL,
        [Date] datetime2 NOT NULL,
        [DayType] nvarchar(30) NOT NULL,
        [WorkScheduleId] int NULL,
        [Notes] nvarchar(500) NULL,
        [CreatedByUserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedByUserId] int NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_EmployeeDailySchedules] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EmployeeDailySchedules_HrEmployees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [HrEmployees] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_EmployeeDailySchedules_WorkSchedules_WorkScheduleId] FOREIGN KEY ([WorkScheduleId]) REFERENCES [WorkSchedules] ([Id])
    );
    CREATE UNIQUE INDEX [IX_EmployeeDailySchedules_EmployeeId_Date] ON [EmployeeDailySchedules] ([EmployeeId], [Date]);
END;

IF OBJECT_ID(N'[HrVacationRanges]', N'U') IS NULL
BEGIN
    CREATE TABLE [HrVacationRanges] (
        [Id] int NOT NULL IDENTITY,
        [EmployeeId] int NOT NULL,
        [DateFrom] datetime2 NOT NULL,
        [DateTo] datetime2 NOT NULL,
        [Notes] nvarchar(500) NULL,
        [IsCancelled] bit NOT NULL CONSTRAINT [DF_HrVacationRanges_IsCancelled] DEFAULT 0,
        [CreatedByUserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CancelledByUserId] int NULL,
        [CancelledAt] datetime2 NULL,
        CONSTRAINT [PK_HrVacationRanges] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_HrVacationRanges_HrEmployees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [HrEmployees] ([Id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_HrVacationRanges_EmployeeId_DateFrom_DateTo] ON [HrVacationRanges] ([EmployeeId], [DateFrom], [DateTo]);
END;

IF OBJECT_ID(N'[BiometricDevices]', N'U') IS NULL
BEGIN
    CREATE TABLE [BiometricDevices] (
        [Id] int NOT NULL IDENTITY,
        [Code] nvarchar(60) NOT NULL,
        [Name] nvarchar(160) NOT NULL,
        [SucursalesId] int NULL,
        [IsActive] bit NOT NULL CONSTRAINT [DF_BiometricDevices_IsActive] DEFAULT 1,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedByUserId] int NULL,
        CONSTRAINT [PK_BiometricDevices] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BiometricDevices_Sucursales_SucursalesId] FOREIGN KEY ([SucursalesId]) REFERENCES [Sucursales] ([Id])
    );
    CREATE UNIQUE INDEX [IX_BiometricDevices_Code] ON [BiometricDevices] ([Code]);
END;

IF OBJECT_ID(N'[BiometricImports]', N'U') IS NULL
BEGIN
    CREATE TABLE [BiometricImports] (
        [Id] int NOT NULL IDENTITY,
        [OriginalFileName] nvarchar(260) NOT NULL,
        [FileHash] nvarchar(120) NOT NULL,
        [FileSize] bigint NOT NULL,
        [ImportedAt] datetime2 NOT NULL,
        [ImportedByUserId] int NOT NULL,
        [RecordsFound] int NOT NULL,
        [RecordsCreated] int NOT NULL,
        [RecordsDuplicated] int NOT NULL,
        [Status] nvarchar(30) NOT NULL,
        [ErrorMessage] nvarchar(2000) NULL,
        CONSTRAINT [PK_BiometricImports] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BiometricImports_Users_ImportedByUserId] FOREIGN KEY ([ImportedByUserId]) REFERENCES [Users] ([Id])
    );
    CREATE INDEX [IX_BiometricImports_FileHash] ON [BiometricImports] ([FileHash]);
END;

IF OBJECT_ID(N'[BiometricPunches]', N'U') IS NULL
BEGIN
    CREATE TABLE [BiometricPunches] (
        [Id] int NOT NULL IDENTITY,
        [BiometricImportId] int NOT NULL,
        [BiometricDeviceId] int NULL,
        [DeviceCode] nvarchar(60) NOT NULL,
        [BiometricEmployeeCode] nvarchar(80) NOT NULL,
        [Timestamp] datetime2 NOT NULL,
        [VerificationMethod] nvarchar(40) NULL,
        [RecordType] nvarchar(40) NULL,
        [WorkCode] nvarchar(40) NULL,
        [RawIndex] int NOT NULL,
        [RawMetadata] nvarchar(max) NOT NULL,
        [DedupeKey] nvarchar(120) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_BiometricPunches] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_BiometricPunches_BiometricDevices_BiometricDeviceId] FOREIGN KEY ([BiometricDeviceId]) REFERENCES [BiometricDevices] ([Id]),
        CONSTRAINT [FK_BiometricPunches_BiometricImports_BiometricImportId] FOREIGN KEY ([BiometricImportId]) REFERENCES [BiometricImports] ([Id]) ON DELETE CASCADE
    );
    CREATE UNIQUE INDEX [IX_BiometricPunches_DedupeKey] ON [BiometricPunches] ([DedupeKey]);
    CREATE INDEX [IX_BiometricPunches_BiometricEmployeeCode_DeviceCode_Timestamp] ON [BiometricPunches] ([BiometricEmployeeCode], [DeviceCode], [Timestamp]);
END;

IF OBJECT_ID(N'[EmployeeBiometricIdentities]', N'U') IS NULL
BEGIN
    CREATE TABLE [EmployeeBiometricIdentities] (
        [Id] int NOT NULL IDENTITY,
        [EmployeeId] int NOT NULL,
        [BiometricDeviceId] int NULL,
        [BiometricEmployeeCode] nvarchar(80) NOT NULL,
        [IsActive] bit NOT NULL CONSTRAINT [DF_EmployeeBiometricIdentities_IsActive] DEFAULT 1,
        [CreatedByUserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_EmployeeBiometricIdentities] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_EmployeeBiometricIdentities_BiometricDevices_BiometricDeviceId] FOREIGN KEY ([BiometricDeviceId]) REFERENCES [BiometricDevices] ([Id]),
        CONSTRAINT [FK_EmployeeBiometricIdentities_HrEmployees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [HrEmployees] ([Id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_EmployeeBiometricIdentities_Code_Device_Active] ON [EmployeeBiometricIdentities] ([BiometricEmployeeCode], [BiometricDeviceId], [IsActive]);
END;

IF OBJECT_ID(N'[AttendanceIncidentTypes]', N'U') IS NULL
BEGIN
    CREATE TABLE [AttendanceIncidentTypes] (
        [Id] int NOT NULL IDENTITY,
        [Code] nvarchar(60) NOT NULL,
        [Name] nvarchar(160) NOT NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_AttendanceIncidentTypes] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_AttendanceIncidentTypes_Code] ON [AttendanceIncidentTypes] ([Code]);
END;

IF OBJECT_ID(N'[AttendanceResolutionTypes]', N'U') IS NULL
BEGIN
    CREATE TABLE [AttendanceResolutionTypes] (
        [Id] int NOT NULL IDENTITY,
        [Code] nvarchar(60) NOT NULL,
        [Name] nvarchar(160) NOT NULL,
        [IsActive] bit NOT NULL,
        CONSTRAINT [PK_AttendanceResolutionTypes] PRIMARY KEY ([Id])
    );
    CREATE UNIQUE INDEX [IX_AttendanceResolutionTypes_Code] ON [AttendanceResolutionTypes] ([Code]);
END;

IF OBJECT_ID(N'[AttendanceWeeks]', N'U') IS NULL
BEGIN
    CREATE TABLE [AttendanceWeeks] (
        [Id] int NOT NULL IDENTITY,
        [Year] int NOT NULL,
        [Week] int NOT NULL,
        [SucursalesId] int NULL,
        [WeekStart] datetime2 NOT NULL,
        [WeekEnd] datetime2 NOT NULL,
        [Status] nvarchar(30) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CreatedByUserId] int NOT NULL,
        [AuthorizedAt] datetime2 NULL,
        [AuthorizedByUserId] int NULL,
        [ClosedAt] datetime2 NULL,
        [ClosedByUserId] int NULL,
        CONSTRAINT [PK_AttendanceWeeks] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AttendanceWeeks_Sucursales_SucursalesId] FOREIGN KEY ([SucursalesId]) REFERENCES [Sucursales] ([Id])
    );
    CREATE UNIQUE INDEX [IX_AttendanceWeeks_Year_Week_SucursalesId] ON [AttendanceWeeks] ([Year], [Week], [SucursalesId]) WHERE [SucursalesId] IS NOT NULL;
    CREATE UNIQUE INDEX [IX_AttendanceWeeks_Year_Week_Global] ON [AttendanceWeeks] ([Year], [Week]) WHERE [SucursalesId] IS NULL;
END;

IF OBJECT_ID(N'[AttendanceDays]', N'U') IS NULL
BEGIN
    CREATE TABLE [AttendanceDays] (
        [Id] int NOT NULL IDENTITY,
        [AttendanceWeekId] int NOT NULL,
        [EmployeeId] int NOT NULL,
        [Date] datetime2 NOT NULL,
        [DayType] nvarchar(30) NOT NULL,
        [PlannedWorkScheduleId] int NULL,
        [PlannedStartTime] time NULL,
        [PlannedEndTime] time NULL,
        [PlannedBreakMinutes] int NOT NULL,
        [FirstPunchAt] datetime2 NULL,
        [LastPunchAt] datetime2 NULL,
        [PunchCount] int NOT NULL,
        [LateMinutes] int NOT NULL,
        [GrossWorkMinutes] int NOT NULL,
        [BreakUsedMinutes] int NOT NULL,
        [CalculatedOvertimeMinutes] int NOT NULL,
        [OvertimeAdjustmentMinutes] int NOT NULL,
        [AuthorizedOvertimeMinutes] int NOT NULL,
        [WorkedSunday] bit NOT NULL,
        [RequiresReview] bit NOT NULL,
        [WarningsJson] nvarchar(max) NULL,
        [RhResolutionCode] nvarchar(60) NULL,
        [RhComments] nvarchar(1000) NULL,
        CONSTRAINT [PK_AttendanceDays] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AttendanceDays_AttendanceWeeks_AttendanceWeekId] FOREIGN KEY ([AttendanceWeekId]) REFERENCES [AttendanceWeeks] ([Id]) ON DELETE CASCADE,
        CONSTRAINT [FK_AttendanceDays_HrEmployees_EmployeeId] FOREIGN KEY ([EmployeeId]) REFERENCES [HrEmployees] ([Id]),
        CONSTRAINT [FK_AttendanceDays_WorkSchedules_PlannedWorkScheduleId] FOREIGN KEY ([PlannedWorkScheduleId]) REFERENCES [WorkSchedules] ([Id])
    );
    CREATE UNIQUE INDEX [IX_AttendanceDays_Week_Employee_Date] ON [AttendanceDays] ([AttendanceWeekId], [EmployeeId], [Date]);
END;

IF OBJECT_ID(N'[AttendanceIncidents]', N'U') IS NULL
BEGIN
    CREATE TABLE [AttendanceIncidents] (
        [Id] int NOT NULL IDENTITY,
        [AttendanceDayId] int NOT NULL,
        [IncidentCode] nvarchar(60) NOT NULL,
        [Description] nvarchar(500) NOT NULL,
        [Status] nvarchar(30) NOT NULL,
        [ResolutionCode] nvarchar(60) NULL,
        [Comments] nvarchar(1000) NULL,
        [CreatedByUserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ResolvedByUserId] int NULL,
        [ResolvedAt] datetime2 NULL,
        CONSTRAINT [PK_AttendanceIncidents] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_AttendanceIncidents_AttendanceDays_AttendanceDayId] FOREIGN KEY ([AttendanceDayId]) REFERENCES [AttendanceDays] ([Id]) ON DELETE CASCADE
    );
END;

IF OBJECT_ID(N'[AttendanceAuditLogs]', N'U') IS NULL
BEGIN
    CREATE TABLE [AttendanceAuditLogs] (
        [Id] int NOT NULL IDENTITY,
        [EntityName] nvarchar(120) NOT NULL,
        [EntityId] int NOT NULL,
        [Action] nvarchar(120) NOT NULL,
        [OldValue] nvarchar(max) NULL,
        [NewValue] nvarchar(max) NULL,
        [Reason] nvarchar(1000) NULL,
        [UserId] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_AttendanceAuditLogs] PRIMARY KEY ([Id])
    );
END;

/* 4) Semillas de asistencia */
INSERT INTO [WorkSchedules] ([Name], [StartTime], [EndTime], [BreakMinutes], [IsActive], [CreatedAt], [CreatedByUserId])
SELECT v.[Name], v.[StartTime], v.[EndTime], v.[BreakMinutes], 1, @now, NULL
FROM (VALUES
    (N'PRE APERTURA', CAST('06:00' AS time), CAST('16:00' AS time), 30),
    (N'APERTURA', CAST('07:00' AS time), CAST('17:00' AS time), 30),
    (N'INTERMEDIO', CAST('08:00' AS time), CAST('18:00' AS time), 30),
    (N'CIERRE', CAST('08:30' AS time), CAST('18:30' AS time), 30),
    (N'SABATINO', CAST('07:30' AS time), CAST('18:00' AS time), 30)
) v([Name], [StartTime], [EndTime], [BreakMinutes])
WHERE NOT EXISTS (SELECT 1 FROM [WorkSchedules] ws WHERE ws.[Name] = v.[Name]);

INSERT INTO [AttendanceIncidentTypes] ([Code], [Name], [IsActive])
SELECT v.[Code], v.[Name], 1
FROM (VALUES
    (N'FALTA_JUSTIFICADA', N'FALTA JUSTIFICADA'),
    (N'FALTA_INJUSTIFICADA', N'FALTA INJUSTIFICADA'),
    (N'INCAPACIDAD_GRAL', N'INCAPACIDAD GRAL'),
    (N'INCAPACIDAD_RT', N'INCAPACIDAD RT'),
    (N'VACACIONES', N'VACACIONES'),
    (N'RETARDO_ENTRADA', N'RETARDO ENTRADA'),
    (N'RETARDO_BREAK', N'RETARDO BREAK'),
    (N'HRS_EXT_EN_DESCANSO', N'HRS EXT EN DESCANSO'),
    (N'DESCANSO_LABORADO', N'DESCANSO LABORADO'),
    (N'FESTIVO_LABORADO', N'FESTIVO LABORADO'),
    (N'RETARDO_JUSTIFICADO', N'RETARDO JUSTIFICADO'),
    (N'FALTA_CON_GOCE', N'FALTA CON GOCE DE SUELDO'),
    (N'SIN_PENALIZACION', N'SIN PENALIZACION'),
    (N'PAGAR_DIA_REGULAR', N'PAGAR DIA REGULAR'),
    (N'SIN_REGISTROS', N'SIN REGISTROS'),
    (N'REGISTRO_INCOMPLETO', N'REGISTRO INCOMPLETO'),
    (N'MARCACION_DURANTE_VACACIONES', N'MARCACION DURANTE VACACIONES')
) v([Code], [Name])
WHERE NOT EXISTS (SELECT 1 FROM [AttendanceIncidentTypes] t WHERE t.[Code] = v.[Code]);

INSERT INTO [AttendanceResolutionTypes] ([Code], [Name], [IsActive])
SELECT v.[Code], v.[Name], 1
FROM (VALUES
    (N'SIN_PENALIZACION', N'SIN PENALIZACION'),
    (N'PAGAR_DIA_REGULAR', N'PAGAR DIA REGULAR'),
    (N'FALTA_JUSTIFICADA', N'FALTA JUSTIFICADA'),
    (N'FALTA_INJUSTIFICADA', N'FALTA INJUSTIFICADA'),
    (N'RETARDO_JUSTIFICADO', N'RETARDO JUSTIFICADO')
) v([Code], [Name])
WHERE NOT EXISTS (SELECT 1 FROM [AttendanceResolutionTypes] t WHERE t.[Code] = v.[Code]);

/* 5) Permisos de RH y asistencia */
IF NOT EXISTS (SELECT 1 FROM [PermissionCategories] WHERE [Key] = N'hr')
BEGIN
    INSERT INTO [PermissionCategories] ([Key], [Label], [Icon])
    VALUES (N'hr', N'Recursos Humanos', N'badge');
END;

IF NOT EXISTS (SELECT 1 FROM [PermissionCategories] WHERE [Key] = N'hr_attendance')
BEGIN
    INSERT INTO [PermissionCategories] ([Key], [Label], [Icon])
    VALUES (N'hr_attendance', N'Asistencia RH', N'fact_check');
END;

DECLARE @HrCategoryId int = (SELECT TOP 1 [Id] FROM [PermissionCategories] WHERE [Key] = N'hr');
DECLARE @AttendanceCategoryId int = (SELECT TOP 1 [Id] FROM [PermissionCategories] WHERE [Key] = N'hr_attendance');

DECLARE @HrPermissions table ([Key] nvarchar(120), [Label] nvarchar(200), [Description] nvarchar(500), [CategoryId] int);
INSERT INTO @HrPermissions ([Key], [Label], [Description], [CategoryId])
VALUES
(N'hr.employees.view', N'Ver empleados', N'Consultar empleados de RH', @HrCategoryId),
(N'hr.employees.create', N'Crear empleados', N'Crear empleados de RH', @HrCategoryId),
(N'hr.employees.edit', N'Editar empleados', N'Modificar expediente de empleados', @HrCategoryId),
(N'hr.employees.terminate', N'Baja de empleados', N'Dar de baja empleados', @HrCategoryId),
(N'hr.employees.rehire', N'Reingresar empleados', N'Reingresar empleados', @HrCategoryId),
(N'hr.salary.change', N'Cambio de sueldo', N'Solicitar cambios de sueldo', @HrCategoryId),
(N'hr.approvals.view', N'Ver aprobaciones RH', N'Consultar aprobaciones de RH', @HrCategoryId),
(N'hr.approvals.manage', N'Gestionar aprobaciones RH', N'Aprobar o rechazar solicitudes de RH', @HrCategoryId),
(N'hr.documents.manage', N'Gestionar documentos RH', N'Cargar, reemplazar y eliminar documentos de expediente', @HrCategoryId),
(N'hr.catalogs.manage', N'Gestionar catalogos RH', N'Administrar catalogos de RH', @HrCategoryId),
(N'attendance.planning.view', N'Ver planeacion semanal', N'Consultar planeacion semanal de personal', @AttendanceCategoryId),
(N'attendance.planning.edit', N'Editar planeacion semanal', N'Generar, copiar y modificar planeacion semanal', @AttendanceCategoryId),
(N'attendance.biometrics.import', N'Importar biometricos', N'Importar KQ/ZIP y asociar biometricos', @AttendanceCategoryId),
(N'attendance.incidents.view', N'Ver incidencias', N'Consultar semanas e incidencias de asistencia', @AttendanceCategoryId),
(N'attendance.incidents.edit', N'Editar incidencias', N'Resolver incidencias y ajustar tiempo extra', @AttendanceCategoryId),
(N'attendance.incidents.authorize', N'Autorizar incidencias', N'Autorizar semanas de incidencias', @AttendanceCategoryId),
(N'attendance.incidents.reopen', N'Reabrir incidencias', N'Reabrir semanas cerradas o autorizadas', @AttendanceCategoryId),
(N'attendance.configuration.manage', N'Configurar asistencia', N'Administrar horarios y dispositivos biometricos', @AttendanceCategoryId);

INSERT INTO [Permissions] ([Key], [Label], [Description], [CategoryId])
SELECT p.[Key], p.[Label], p.[Description], p.[CategoryId]
FROM @HrPermissions p
WHERE NOT EXISTS (SELECT 1 FROM [Permissions] existing WHERE existing.[Key] = p.[Key]);

/* 6) Asignar permisos al rol principal.
      Cambia @GrantToRoleName si tu rol de RH/Admin tiene otro nombre.
*/
DECLARE @GrantToRoleName nvarchar(256) = N'SuperAdmin';
DECLARE @GrantRoleId int = (
    SELECT TOP 1 [Id]
    FROM [Roles]
    WHERE [Name] = @GrantToRoleName OR [NormalizedName] = UPPER(@GrantToRoleName)
);

IF @GrantRoleId IS NOT NULL
BEGIN
    INSERT INTO [RolePermissions] ([RoleId], [PermissionId])
    SELECT @GrantRoleId, p.[Id]
    FROM [Permissions] p
    WHERE p.[Key] IN (
        N'hr.employees.view',
        N'hr.employees.create',
        N'hr.employees.edit',
        N'hr.employees.terminate',
        N'hr.employees.rehire',
        N'hr.salary.change',
        N'hr.approvals.view',
        N'hr.approvals.manage',
        N'hr.documents.manage',
        N'hr.catalogs.manage',
        N'attendance.planning.view',
        N'attendance.planning.edit',
        N'attendance.biometrics.import',
        N'attendance.incidents.view',
        N'attendance.incidents.edit',
        N'attendance.incidents.authorize',
        N'attendance.incidents.reopen',
        N'attendance.configuration.manage'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM [RolePermissions] rp
        WHERE rp.[RoleId] = @GrantRoleId
          AND rp.[PermissionId] = p.[Id]
    );
END;

/* 7) Marcar migraciones como aplicadas si estas usando EF migrations history */
IF OBJECT_ID(N'[__EFMigrationsHistory]', N'U') IS NOT NULL
BEGIN
    IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260908000100_AddHrEmployeePhotos')
        INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260908000100_AddHrEmployeePhotos', N'8.0.20');

    IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260912000100_SeedHrPositionsCatalog')
        INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260912000100_SeedHrPositionsCatalog', N'8.0.20');

    IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260912000200_AddHrEmployeeBirthDate')
        INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260912000200_AddHrEmployeeBirthDate', N'8.0.20');

    IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260914000100_AddHrEmergencyContactRelationship')
        INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260914000100_AddHrEmergencyContactRelationship', N'8.0.20');

    IF NOT EXISTS (SELECT 1 FROM [__EFMigrationsHistory] WHERE [MigrationId] = N'20260922010149_AddHrAttendanceModule')
        INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES (N'20260922010149_AddHrAttendanceModule', N'8.0.20');
END;

COMMIT TRANSACTION;

/* Validacion rapida */
SELECT 'WorkSchedules' AS Tabla, COUNT(*) AS Total FROM [WorkSchedules]
UNION ALL SELECT 'AttendanceIncidentTypes', COUNT(*) FROM [AttendanceIncidentTypes]
UNION ALL SELECT 'AttendanceResolutionTypes', COUNT(*) FROM [AttendanceResolutionTypes]
UNION ALL SELECT 'Permisos HR/Asistencia', COUNT(*) FROM [Permissions] WHERE [Key] LIKE N'hr.%' OR [Key] LIKE N'attendance.%';
