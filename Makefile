SHELL := /bin/zsh

.PHONY: split validate all

split:
	 D=$(D) S=$(S) ./bin/split_tickets.zsh

validate:
	 D=$(D) S=$(S) ./bin/validate_split.zsh

all: split validate
