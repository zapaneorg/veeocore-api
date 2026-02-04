<?php
/**
 * VeeoCore API - Exemple PHP
 * Calcul de prix pour un trajet VTC
 */

define('API_BASE', 'https://api-core.veeo-stras.fr/api/v1');
define('API_KEY', 'YOUR_API_KEY'); // Remplacez par votre clé API

function calculatePrice(array $origin, array $destination): array
{
    $ch = curl_init(API_BASE . '/pricing/calculate');
    
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-API-Key: ' . API_KEY
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'origin' => $origin,
            'destination' => $destination
        ])
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode !== 200) {
        throw new Exception("HTTP Error: $httpCode");
    }
    
    return json_decode($response, true);
}

// Exemple d'utilisation
$origin = [
    'lat' => 48.5734,
    'lng' => 7.7521,
    'address' => 'Gare de Strasbourg'
];

$destination = [
    'lat' => 48.5853,
    'lng' => 7.7350,
    'address' => 'Aéroport de Strasbourg-Entzheim'
];

echo "Calcul du prix...\n";
$result = calculatePrice($origin, $destination);

echo "\n📍 Trajet: {$result['distance_km']} km - {$result['duration_min']} min\n";

echo "\n💰 Prix par véhicule:\n";
foreach ($result['prices'] as $vehicle) {
    echo "   {$vehicle['name']}: {$vehicle['price']}€\n";
}
