sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, Filter, FilterOperator) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.AppliedCandidates", {

        onInit: function () {
            const router = this.getOwnerComponent().getRouter();
            router
                .getRoute("AppliedCandidates")
                .attachPatternMatched(this._onObjectMatched, this);
        },
        _onObjectMatched: async function () {
            var LoginFUnction = await this.commonLoginFunction("AppliedCandidates");
            if (!LoginFUnction) return;
            this.AC_ReadCall();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Recruitment Dashboard");
        },

        AC_ReadCall: async function () {
            this.getBusyDialog();
            var data = await this.ajaxReadWithJQuery("JobApplications");
            let tableModel = new JSONModel(data.data);
            this.getOwnerComponent().setModel(tableModel, "DataTableModel");
            this.closeBusyDialog();
        },
        onPressback: function () {
            this.getOwnerComponent().getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
            this.CommonLogoutFunction();
        },
        onCandidatePress: function (oEvent) {
            let data = oEvent.getSource().getBindingContext("DataTableModel");
            let id = data.getObject().ID;
            // Navigate to the detail view of the selected candidate
            this.getOwnerComponent().getRouter().navTo("AppliedCanDetail", { id: id });
        },
        onFilterBarClear: function () {
            this.byId("filterEmployeeName").setSelectedKey("");
            this.byId("filterNoticePeriod").setSelectedKey("");
            this.byId("filterSkills").setValue("");
            this.byId("filterExperience").setSelectedKey("");

            // const oTable = this.byId("appliedCandidatesTable");
            // const oBinding = oTable.getBinding("items");
            // oBinding.filter([]);
        },
        onFilterBarSearch: function () {
            // Get all the filter values from the UI
            const sName = this.byId("filterEmployeeName").getValue().toLowerCase();
            const sNoticePeriod = this.byId("filterNoticePeriod").getValue().toLowerCase();
            const sSkills = this.byId("filterSkills").getValue().toLowerCase();
            const sExperienceRange = this.byId("filterExperience").getValue(); // e.g., "2-4"

            const oTable = this.byId("appliedCandidatesTable");
            const oBinding = oTable.getBinding("items");
            const oCustomFilter = new sap.ui.model.Filter({
                test: function (oCandidate) {
                    let bNameMatch = true;
                    let bNoticePeriodMatch = true;
                    let bSkillsMatch = true;
                    let bExperienceMatch = true;
                    if (sName) {
                        bNameMatch = oCandidate.Name?.toLowerCase().includes(sName);
                    }
                    if (sNoticePeriod) {
                        bNoticePeriodMatch = oCandidate.NoticePeriod?.toLowerCase() === sNoticePeriod;
                    }
                    if (sSkills) {
                        bSkillsMatch = oCandidate.Skills?.toLowerCase().includes(sSkills);
                    }
                    if (sExperienceRange) {
                        const candidateExp = parseFloat(oCandidate.Experience);
                        if (isNaN(candidateExp)) {
                            bExperienceMatch = false;
                        } else {
                            const aRange = sExperienceRange.split('-').map(Number);
                            const minExp = aRange[0];
                            const maxExp = aRange[1];
                            bExperienceMatch = (candidateExp >= minExp && candidateExp <= maxExp);
                        }
                    }
                    return bNameMatch && bNoticePeriodMatch && bSkillsMatch && bExperienceMatch;
                }
            });
            oBinding.filter([oCustomFilter]);
        },
    });
});