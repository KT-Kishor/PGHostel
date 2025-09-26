sap.ui.define([
	"sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel",
         "../model/formatter",
], function(
	Controller,
    JSONModel,
    Formatter
) {
	"use strict";

	return Controller.extend("sap.kt.com.minihrsolution.controller.Job_Details", {
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
          const oView = this.getView();
          this.byId("V1_ID_Table").setBusy(true);

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
            //   this._loadComboBoxModels(activeCandidates, oView);
              this.byId("V1_ID_Table").setBusy(false);
            }.bind(this),
            error: function (error) {
              const oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
              const fallbackMessage = oResourceBundle.getText("V1_m_errFetchD");
              const errorMessage = error?.responseJSON?.message || fallbackMessage;
              MessageToast.show("Error: " + errorMessage);
              this.byId("V1_ID_Table").setBusy(false);
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
          onSearch: function (oEvent) {
          var sQuery = oEvent.getParameter("query") || oEvent.getSource().getValue();
          var oTable = this.byId("V1_ID_Table");
          var oBinding = oTable.getBinding("items");

          if (sQuery && sQuery.length > 0) {
            var oFilter = new sap.ui.model.Filter({
              path: "PrimarySkills",
              operator: sap.ui.model.FilterOperator.Contains,
              value1: sQuery
            });
            oBinding.filter([oFilter]);
          } else {
            oBinding.filter([]); // clear filters if empty
          }
        },
	});
});