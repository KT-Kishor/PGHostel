sap.ui.define(
  [
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "../model/formatter",
  ],
  function (BaseController, JSONModel, MessageToast, Formatter) {
    "use strict";

    return BaseController.extend(
      "sap.kt.com.minihrsolution.controller.Job_Details",
      {
        Formatter: Formatter,
        onInit: function () {
            this.getOwnerComponent().getRouter().getRoute("Job_Details").attachMatched(this._onRouteMatched, this);
        },
        _onRouteMatched:function(){
      this._loadCareerSectionData();
            
        },
        onpresshome: function () {
            // this.getOwnerComponent().getRouter().navTo("RouteHomePage");
             const oAppStateModel = this.getOwnerComponent().getModel("AppStateModel");
            const sTabKey = "idCareer"

            this.getOwnerComponent().getRouter().navTo("RouteHomePage");

            sessionStorage.setItem("homePageReturnTab", sTabKey);
        },
          _loadCareerSectionData: function () {
  const oAppConfigModel = new JSONModel({
            url: "https://rest.kalpavrikshatechnologies.com/",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
          });
          this.getOwnerComponent().setModel(oAppConfigModel, "AppConfigModel");



          const oExpYears = new JSONModel();
          oExpYears.loadData("model/ExpYears.json", null, false);
          this.getView().setModel(oExpYears, "ExpYears");

          // this.byId("V1_ID_Table").setBusy(true);



          const oView = this.getView();
            this.getBusyDialog();

          $.ajax({
            url: "https://rest.kalpavrikshatechnologies.com/JobOpenings",
            type: "GET",
            contentType: "application/json",
            dataType: "json",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            success: function (response) {
              const allCandidates = response?.data || [];
              const activeCandidates = allCandidates.filter((candidate) => candidate.Status === "true");
              const oModel = new JSONModel({ Candidates: activeCandidates });
              oView.setModel(oModel, "JobApplicationModel");
              this._loadComboBoxModels(activeCandidates, oView);
               this.closeBusyDialog();
            }.bind(this),
            error: function (error) {
              const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
              const fallbackMessage = oResourceBundle.getText("V1_m_errFetchD");
              const errorMessage = error?.responseJSON?.message || fallbackMessage;
              MessageToast.show("Error: " + errorMessage);
               this.closeBusyDialog();
            }.bind(this),
          });
        },
          v1_onViewItem: function (oEvent) {
          const oSelectedData = oEvent
            .getSource()
            .getBindingContext("JobApplicationModel")
            .getObject();
          const sJobId = oSelectedData.ID; // Or whatever your unique field is

          // Set global tab info
          const oAppStateModel =
            this.getOwnerComponent().getModel("AppStateModel");
          if (oAppStateModel) {
            oAppStateModel.setProperty("/previousTab", "idCareer");
            // oAppStateModel.setProperty("/previousTab", "idProducts");
          }
          // Navigate using the jobId
          this.getOwnerComponent().getRouter().navTo("RouteJobView", {
            jobId: sJobId,
          });
        },
        //   onSearch: function (oEvent) {
        //   var sQuery = oEvent.getParameter("query") || oEvent.getSource().getValue();
        //   var oTable = this.byId("V1_ID_Table");
        //   var oBinding = oTable.getBinding("items");

        //   if (sQuery && sQuery.length > 0) {
        //     var oFilter = new sap.ui.model.Filter({
        //       path: "PrimarySkills",
        //       operator: sap.ui.model.FilterOperator.Contains,
        //       value1: sQuery
        //     });
        //     oBinding.filter([oFilter]);
        //   } else {
        //     oBinding.filter([]); // clear filters if empty
        //   }
        // },
          V1_onSearch: function () {
          const oSkillInput = this.byId("V1_ID_SkillsInput")
            ?.getValue()
            ?.trim();
          const oLocationKey = this.byId("V1_ID_LocationComboBox")?.getValue();
          const oExpCombo = this.byId("V1_ID_ExpComboBox")
            ?.getSelectedItem()
            ?.getText();

          // --- Build payload ---
          const oFilterPayload = {
            PrimarySkills: oSkillInput || "",
            Location: oLocationKey || "",
            Experience: oExpCombo || "",
          };

          // --- Send POST to backend ---
          this.getBusyDialog();
          $.ajax({
            url: "https://rest.kalpavrikshatechnologies.com/JobOpenings" + "?" + $.param(oFilterPayload),

            method: "GET",
            contentType: "application/json",
            dataType: "json",
            headers: {
              name: "$2a$12$LC.eHGIEwcbEWhpi9gEA.umh8Psgnlva2aGfFlZLuMtPFjrMDwSui",
              password: "$2a$12$By8zKifvRcfxTbabZJ5ssOsheOLdAxA2p6/pdaNvv1xy1aHucPm0u",
            },
            success: function (response) {
              const aData = response?.data || [];
              const aFilteredData = aData.filter((job) => job?.Status === "true");
              const oFilteredModel = new sap.ui.model.json.JSONModel({
                Candidates: aFilteredData,
              });
              this.getView().setModel(oFilteredModel, "JobApplicationModel");

              this.closeBusyDialog();
            }.bind(this),
            error: function (err) {
              this.closeBusyDialog();
              if (err?.responseJSON?.message) {
                MessageToast.show("Error: " + err.responseJSON.message);
              } else {
                MessageToast.show("Failed to load filtered data.");
              }
            }.bind(this),
          });
        },
          _loadComboBoxModels: function (aCandidates, oView) {
          function getUniqueValuesByKey(key) {
            var map = {};
            var result = [];

            for (var i = 0; i < aCandidates.length; i++) {
              var val = aCandidates[i][key];
              if (typeof val === "string") {
                val = val.trim();
              }
              if (val && !map[val]) {
                result.push({
                  key: val,
                });
                map[val] = true;
              }
            }

            result.sort((a, b) => a.key.localeCompare(b.key));
            return result;
          }

          oView.setModel(
            new JSONModel(getUniqueValuesByKey("PrimarySkills")),
            "SkillModel"
          );
          oView.setModel(
            new JSONModel(getUniqueValuesByKey("Location")),
            "LocationModel"
          );
          oView.setModel(
            new JSONModel(getUniqueValuesByKey("Experience")),
            "ExpModel"
          );
        },

        v1_filClear: function () {
          this.byId("V1_ID_SkillsInput").setValue("");
          this.byId("V1_ID_LocationComboBox").setSelectedKey("");
          this.byId("V1_ID_ExpComboBox").setSelectedKey("");
        },

        onSuggestSkills: function (oEvent) {
          const sValue = oEvent.getParameter("suggestValue")?.toLowerCase() || "";

          const aTableData =
            this.getView()
              .getModel("JobApplicationModel")
              ?.getProperty("/Candidates") || [];
          const aActiveJobs = aTableData.filter(job => job?.Status === "true");
          const aMatchedSkills = aActiveJobs
            .map(item => item.PrimarySkills?.trim())
            .filter(Boolean)
            .flatMap(skillStr => skillStr.split(","))
            .map(skill => skill.trim())
            .filter(skill => skill.toLowerCase().includes(sValue));
          const aUniqueSkills = [...new Set(aMatchedSkills)];
          const aSuggestionItems = aUniqueSkills.map(skill => ({ skill }));
          const oSuggestModel = new sap.ui.model.json.JSONModel({
            skills: aSuggestionItems
          });
          this.getView().setModel(oSuggestModel, "skillModel");
        },
	});
});