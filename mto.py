#!/usr/bin/python

import RPi.GPIO as GPIO
# import requests as req
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
    lcd = HD44780()
    #r = req.get('https://api.checkwx.com/metar/LFPO', headers={"X-API-Key": "a61f8e9f3c9a4f8083910ef199"})
    #r = req.get('https://api.checkwx.com/taf/LFPO', headers={"X-API-Key": "a61f8e9f3c9a4f8083910ef199"})
    #lcd.message(r.text)
    #all = str(r.json()['data'])[2:-2]
    #l1 = all[5:21]
    #l2 = all[21:37]
    #l3 = all[37:53]
    #l4 = all[53:69]
    #print(all)
    #print(l1)
    #print(l2)
    #print(l3)
    #print(l4)
    #lcd.message(l1 + l3 + "\n" + l2 + l4)
    #lcd.message(" Raspberry Pi YOLOOOOO\n  Take a byte!")
    proc = subprocess.run('node /home/dietpi/scraper.js', shell=True, capture_output=True, text=True, check=True)
    lcd.message(proc.stdout)
    
    GPIO.cleanup()
