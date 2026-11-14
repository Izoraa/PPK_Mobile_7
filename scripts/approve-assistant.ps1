#Requires -Version 7.5

[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z][a-z0-9-]{4,28}[a-z0-9]$')]
    [string]$ProjectId,

    [Parameter(Mandatory)]
    [ValidatePattern('^[A-Za-z0-9_-]{1,128}$')]
    [string]$Uid,

    [Parameter(Mandatory)]
    [ValidatePattern('^[^\s@]+@[^\s@]+$')]
    [string]$ApprovedEmail,

    [Parameter(Mandatory)]
    [ValidatePattern('^[a-z0-9-]+@[a-z0-9.-]+\.gserviceaccount\.com$')]
    [string]$ServiceAccount
)

$ErrorActionPreference = 'Stop'

$accessToken = gcloud auth print-access-token "--impersonate-service-account=$ServiceAccount" --quiet
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($accessToken)) {
    throw 'Could not obtain an access token for the provisioning service account.'
}

$headers = @{ Authorization = "Bearer $accessToken" }
$lookupUri = "https://identitytoolkit.googleapis.com/v1/projects/$ProjectId/accounts:lookup"
$lookupBody = @{ localId = @($Uid) } | ConvertTo-Json

try {
    $lookup = Invoke-RestMethod -Method Post -Uri $lookupUri -Headers $headers -ContentType 'application/json' -Body $lookupBody
}
catch {
    throw 'Could not verify the account in Firebase Authentication. Check the project and Firebase Auth IAM permissions.'
}

$accounts = @($lookup.users)
if ($accounts.Count -ne 1 -or $accounts[0].localId -cne $Uid -or
    $accounts[0].email -cne $ApprovedEmail -or $accounts[0].disabled -eq $true) {
    throw 'Firebase Authentication does not have an enabled account matching the approved UID and email.'
}

$database = "projects/$ProjectId/databases/(default)"
$document = "$database/documents/users/$Uid"
$api = 'https://firestore.googleapis.com/v1'

try {
    $response = Invoke-WebRequest -Method Get -Uri "$api/$document" -Headers $headers
    $profile = $response.Content | ConvertFrom-Json -DateKind String
}
catch {
    throw 'Could not read the profile. Check the project, UID, and Firestore IAM permissions.'
}

if ($profile.name -cne $document -or $profile.fields.uid.stringValue -cne $Uid -or
    $profile.fields.email.stringValue -cne $ApprovedEmail -or
    $profile.fields.requestedRole.stringValue -cne 'assistant') {
    throw 'The profile does not match the approved account or has no assistant request.'
}

if ($profile.fields.role.stringValue -ceq 'assistant') {
    Write-Output 'Assistant account is already active.'
    return
}

if ($profile.fields.role.stringValue -cne 'student' -or -not $profile.updateTime) {
    throw 'The profile is not eligible for assistant activation.'
}

$body = @{
    writes = @(
        @{
            update = @{
                name = $document
                fields = @{ role = @{ stringValue = 'assistant' } }
            }
            updateMask = @{ fieldPaths = @('role') }
            updateTransforms = @(@{ fieldPath = 'updatedAt'; setToServerValue = 'REQUEST_TIME' })
            currentDocument = @{ updateTime = $profile.updateTime }
        }
    )
} | ConvertTo-Json -Depth 10

try {
    $null = Invoke-RestMethod -Method Post -Uri "$api/$database/documents:commit" `
        -Headers $headers -ContentType 'application/json' -Body $body
}
catch {
    throw 'Activation was not confirmed. Re-run for the same approved account to check its current status.'
}

Write-Output 'Assistant account activated.'
