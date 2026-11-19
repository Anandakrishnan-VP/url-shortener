package com.shortly.urlshortener.encoder;

public interface CodeEncoder {
    String encode(long value);
    long decode(String code);
}
