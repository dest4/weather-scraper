#!/usr/bin/python

import RPi.GPIO as GPIO
import subprocess
from time import sleep

class HD44780:
    def __init__(self, pin_rs=17, pin_rw=27, pin_e=22, pins_db=[15, 18, 23, 24]):

        self.pin_rs=pin_rs
        self.pin_rw=pin_rw
        self.pin_e=pin_e
        self.pins_db=pins_db

        GPIO.setmode(GPIO.BCM)
        GPIO.setup(self.pin_e, GPIO.OUT)
        GPIO.setup(self.pin_rs, GPIO.OUT)
        GPIO.setup(self.pin_rw, GPIO.OUT)
        for pin in self.pins_db:
            GPIO.setup(pin, GPIO.OUT)

        self.clear()

        GPIO.output(self.pin_rw, False)

    def clear(self):
        """ Blank / Reset LCD """

        self.cmd(0x33) # $33 8-bit mode
        self.cmd(0x32) # $32 8-bit mode
        self.cmd(0x28) # $28 8-bit mode
        self.cmd(0x0C) # $0C 8-bit mode
        self.cmd(0x06) # $06 8-bit mode
        self.cmd(0x01) # $01 8-bit mode

    def cmd(self, bits, char_mode=False):
        """ Send command to LCD """

        sleep(0.001)
        bits=bin(bits)[2:].zfill(8)

        GPIO.output(self.pin_rs, char_mode)

        for pin in self.pins_db:
            GPIO.output(pin, False)

        for i in range(4):
            if bits[i] == "1":
                GPIO.output(self.pins_db[::-1][i], True)

        GPIO.output(self.pin_e, True)
        GPIO.output(self.pin_e, False)

        for pin in self.pins_db:
            GPIO.output(pin, False)

        for i in range(4,8):
            if bits[i] == "1":
                GPIO.output(self.pins_db[::-1][i-4], True)


        GPIO.output(self.pin_e, True)
        GPIO.output(self.pin_e, False)

    def message(self, text):
        """ Send string to LCD. Newline wraps to second line"""

        for char in text:
            if char == '\n':
                self.cmd(0xC0) # next line
            else:
                self.cmd(ord(char),True)

if __name__ == '__main__':
    proc = subprocess.run('node /home/dietpi/scraper.js', shell=True, capture_output=True, text=True, check=True)
    lcd = HD44780()
    lcd.message(proc.stdout)
    GPIO.cleanup()
    
    # bare bones export of info for web interface
    f = open('/home/dietpi/output/index.html', 'w')
    f.write('<html>' + \
        '<head><style type="text/css" media="screen">' + \
            '.container { display: flex; align-items: center; height: 100%; flex-direction: column; justify-content: center; }' + \
            'p { text-align: center; font-family: monospace; font-size: 300%; }' + \
        '</style></head>' + \
        '<body>' + \
        '<div class="container">' + \
            '<p>' + proc.stdout[0:16] + '</p>' + \
            '<p>' + proc.stdout[16:32] + '</p>' + \
            '<p>' + proc.stdout[32:48] + '</p>' + \
            '<p>' + proc.stdout[48:64] + '</p>' + \
        '</div>' + \
        '</body>' + \
    '</html>')
    f.close()