import pandas
import urllib.request

data = pandas.read_csv("transcribed_dataset.csv")
print(data)

def getName(item):
    if item["name type"] == "common":
        return item["common name"]
    else:
        return item["scientific name"]

def getTaxonomicData(item):
    webPage = urllib.request.urlopen("http://www.itis.gov/ITISWebService/services/ITISService/searchByScientificName?srchKey=" + getName(item).replace(" ", "%20"))

    webString = webPage.read().decode("utf-8")

    taxonomy = []

    if webString.find(":tsn>") >= 0:
        tsn = webString[webString.find("<ax21:tsn>") + 10:webString.find("</", webString.find("<ax21:tsn>"))]
        item["tsn"] = tsn
        webPage = urllib.request.urlopen("http://www.itis.gov/ITISWebService/services/ITISService/getFullHierarchyFromTSN?tsn=" + tsn)
        webString = webPage.read().decode("utf-8")
        print(webString)
        while webString.find("<ax21:taxonName>") >= 0:
            newTaxon = webString[webString.find("<ax21:taxonName>") + 16:webString.find("</", webString.find("<ax21:taxonName>"))]
            if (len(newTaxon) > 0):
                taxonomy += [newTaxon]
            webString = webString[webString.find("</ax21:taxonName>") + 17:]
        if len(taxonomy) > 0 and taxonomy[0] == "Animalia":
            print(webString)
            item["taxonomic classification"] = taxonomy
            return taxonomy
        else:
            print(getName(item))
            return "FIX"
    else:
        print(getName(item))
        return "FIX"

data["taxonomic classifivation"] = data.apply(getTaxonomicData, axis=1)

data.to_csv("taxonomized_dataset.csv", index=False)