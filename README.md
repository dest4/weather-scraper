# Weather scraper

![scraper](device.jpg)

Scrapes weather data from [Météo France](https://meteofrance.com/).

Also grabs Paris Orly weather report.

Displays result on a LCD screen connected to an old Pine64 board I had lying around.

## Display pattern

### Line 1
`MM-DD MM->NNC RL`

- `MM` month
- `DD` day of month
- `MM` minimum temperature of the day (°C)
- `NN` maximum temperature of the day (°C)
- `RL` rain label:
  - `ra` if mild rain in the next hour,
  - `RA` if big one.
  - If no rain forecast, gets the allergo-pollinic risk from [pollens.fr](https://pollens.fr/) instead: from `G2` (high risk) to `G3` (maximum risk).
  - If no pollen alert, gets the atmospheric report from [AirParif](https://airparif.asso.fr/): `A+` (good), `A=` (medium), `A-` (poor), `A!` (bad).

### Line 2
Weather description according to Météo France.

### Line 3
`QNH WWWWWW`

- `QNH` atmospheric pressure at sea level, e.g. `1013` (hPa).
- `WWWWWW` wind in the METAR format, like `10009G19KT`, to read as "wind coming from east (100°) at 9 knots, with gusting at 19 knots" (variable direction is omitted).

### Line 4
Ephemeris of the day, which saint we should celebrate!

## Development

`node scraper.js --verbose`