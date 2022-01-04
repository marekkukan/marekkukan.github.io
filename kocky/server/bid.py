from functools import total_ordering


@total_ordering
class Bid:

    def __init__(self, quantity, number):
        self.quantity = quantity
        self.number = number

    def __str__(self):
        return str(self.quantity) + ' ' + str(self.number)

    def __eq__(self, other):
        return self.quantity == other.quantity and self.number == other.number

    def __gt__(self, other):
        return self._adjusted_quantity() > other._adjusted_quantity() or \
                (self._adjusted_quantity() == other._adjusted_quantity() and \
                 self.number > other.number)

    def _adjusted_quantity(self):
        return 2 * self.quantity if self.number == 1 else self.quantity


def bid2dict(bid):
    return None if bid is None else {'quantity': bid.quantity, 'number': bid.number}
