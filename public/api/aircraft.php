<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Method not allowed']);
  exit;
}

$lat = filter_input(INPUT_GET, 'lat', FILTER_VALIDATE_FLOAT);
$lon = filter_input(INPUT_GET, 'lon', FILTER_VALIDATE_FLOAT);
$dist = filter_input(INPUT_GET, 'dist', FILTER_VALIDATE_INT);
if ($lat === false || $lat === null || $lon === false || $lon === null ||
    $dist === false || $dist === null || $lat < -90 || $lat > 90 ||
    $lon < -180 || $lon > 180 || $dist < 10 || $dist > 250) {
  http_response_code(400);
  echo json_encode(['error' => 'Provide valid lat, lon, and dist (10–250 nautical miles).']);
  exit;
}

$url = sprintf('https://api.adsb.lol/v2/lat/%.5f/lon/%.5f/dist/%d', $lat, $lon, $dist);
$context = stream_context_create([
  'http' => [
    'method' => 'GET',
    'timeout' => 12,
    'header' => "Accept: application/json\r\nUser-Agent: AvioraLive/1.0 (live aircraft map)\r\n"
  ],
  'ssl' => ['verify_peer' => true, 'verify_peer_name' => true]
]);
$body = @file_get_contents($url, false, $context);
if ($body === false) {
  http_response_code(502);
  echo json_encode(['error' => 'The live aircraft data provider is temporarily unavailable. Please retry shortly.']);
  exit;
}
$data = json_decode($body, true);
if (!is_array($data) || !isset($data['ac']) || !is_array($data['ac'])) {
  http_response_code(502);
  echo json_encode(['error' => 'The live aircraft provider returned an unexpected response.']);
  exit;
}
echo json_encode([
  'ac' => $data['ac'],
  'total' => count($data['ac']),
  'now' => $data['now'] ?? (int) (microtime(true) * 1000),
  'source' => 'adsb.lol',
  'center' => ['lat' => $lat, 'lon' => $lon, 'radius_nm' => $dist]
], JSON_UNESCAPED_SLASHES);
