# Weather scraper

![scraper](device.jpg)

Scrapes weather data from meteofrance.fr

Also grabs Paris Orly weather report.

Displays result on a LCD screen connected to an old Pine64 board I had lying around.

## Display pattern

### Line 1
`MM-DD MM->NNC RL`

- `MM` month
- `DD` day of month
- `MM` minimum temperature of the day (°C)
- `NN` maximum temperature of the day (°C)
- `RL` rain label, either empty `  ` if no rain in the next hour, `ra` if mild rain, `RA` if big one.

### Line 2
Weather description according to Météo France.

### Line 3
`QNH WWWWWW`

- `QNH` atmospheric pressure at sea level, e.g. `1013` (hPa).
- `WWWWWW` wind in the METAR format, like `10009G19KT`, to read as "wind coming from east (100°) at 9 knots, with gusting at 19 knots" (variable direction is omitted).

### Line 4
Ephemeris of the day, which saint we should celebrate!