from models import Lead, LeadSource


# Points breakdown — total possible: 100
_SOURCE_POINTS = {
    LeadSource.REFERRAL: 25,
    LeadSource.ORGANIC:  20,
    LeadSource.PAID:     15,
    LeadSource.SOCIAL:   12,
    LeadSource.DIRECT:   10,
    LeadSource.OTHER:     5,
}

_STAGE_POINTS = {
    "new":        0,
    "contacted": 10,
    "qualified": 20,
    "proposal":  25,
    "won":       30,
    "lost":       0,
}


def calculate_score(lead: Lead) -> int:
    score = 0

    # Contact completeness (up to 35 pts)
    score += 20 if lead.email else 0
    score += 15 if lead.phone else 0

    # Profile completeness (up to 10 pts)
    score += 10 if lead.company else 0

    # Source quality (up to 25 pts)
    score += _SOURCE_POINTS.get(lead.source, 5)

    # Pipeline progress (up to 30 pts)
    score += _STAGE_POINTS.get(lead.stage, 0)

    return min(score, 100)


def score_label(score: int) -> str:
    if score >= 80:
        return "hot"
    if score >= 50:
        return "warm"
    return "cold"
