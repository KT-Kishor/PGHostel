sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast"
], function (BaseController, JSONModel, Filter, FilterOperator, MessageToast) {
    "use strict";

    return BaseController.extend("sap.kt.com.minihrsolution.controller.AppliedCandidates", {

        onInit: function () {
            const router = this.getOwnerComponent().getRouter();
            router.getRoute("AppliedCandidates").attachPatternMatched(this._onObjectMatched, this);
        },

        _onObjectMatched: async function () {
            var LoginFUnction = await this.commonLoginFunction("AppliedCandidates");
            if (!LoginFUnction) return;
            this.AC_ReadCall();
            this.getView().getModel("LoginModel").setProperty("/HeaderName", "Recruitment Dashboard");
            this._makeDatePickersReadOnly(["filterExperience"]);
        },

        AC_ReadCall: async function () {
            this.getBusyDialog();
            try {
                const data = await this.ajaxReadWithJQuery("JobApplications");
                const aCandidates = data.data || [];
                // Set table data
                const tableModel = new JSONModel(aCandidates);
                this.getOwnerComponent().setModel(tableModel, "DataTableModel");
                // Prepare unique names
                const aUniqueNames = [];
                const nameSet = new Set();
                aCandidates.forEach(candidate => {
                    if (candidate.FullName && !nameSet.has(candidate.FullName)) {
                        nameSet.add(candidate.FullName);
                        aUniqueNames.push({ FullName: candidate.FullName });
                    }
                });
                const nameModel = new JSONModel(aUniqueNames);
                this.getView().setModel(nameModel, "UniqueNamesModel");
            } catch (err) {
                MessageToast.show("Failed to load candidate data.");
            } finally {
                this.closeBusyDialog();
            }
        },
        onPressback: function () {
            this.getOwnerComponent().getRouter().navTo("RouteTilePage");
        },

        onLogout: function () {
            this.CommonLogoutFunction();
        },

        onCandidatePress: function (oEvent) {
            const data = oEvent.getSource().getBindingContext("DataTableModel");
            const id = data.getObject().ID;
            this.getOwnerComponent().getRouter().navTo("AppliedCanDetail", { id: id });
        },

        onFilterBarClear: function () {
            this.byId("filterEmployeeName").setSelectedKey("");
            this.byId("filterNoticePeriod").setValue("");
            this.byId("filterSkills").setValue("");
            this.byId("filterExperience").setValue("");

            // const oTable = this.byId("appliedCandidatesTable");
            // const oBinding = oTable.getBinding("items");
            // oBinding.filter([]);
        },

        onFilterBarSearch: async function () {
            await this.getBusyDialog();
            try {
                const sName = this.byId("filterEmployeeName").getValue();
                const sNoticePeriod = this.byId("filterNoticePeriod").getValue();   // Allow typed input
                const sSkills = this.byId("filterSkills").getValue();
                const experienceText = this.byId("filterExperience").getValue();     // Allow typed input
                const aFilters = [];

                if (sName) {
                    aFilters.push(new Filter("FullName", FilterOperator.Contains, sName));
                }
                if (sNoticePeriod) {
                    aFilters.push(new Filter("NoticePeriod", FilterOperator.EQ, sNoticePeriod));
                }
                if (sSkills) {
                    aFilters.push(new Filter("Skills", FilterOperator.Contains, sSkills));
                }
                if (experienceText) {
                    const [min, max] = experienceText.split("-").map(Number);
                    if (!isNaN(min) && !isNaN(max)) {
                        aFilters.push(new Filter({
                            filters: [
                                new Filter("Experience", FilterOperator.GE, min),
                                new Filter("Experience", FilterOperator.LE, max)
                            ],
                            and: true
                        }));
                    }
                }
                const oTable = this.byId("appliedCandidatesTable");
                const oBinding = oTable.getBinding("items");
                oBinding.filter(aFilters);
            } catch (error) {
                MessageToast.show("Error during filtering.");
            } finally {
                this.closeBusyDialog();
            }
        },
        // Utility function to extract unique skills and set to model
        onSuggestSkills: function (oEvent) {
            let sValue = oEvent.getParameter("suggestValue")?.toLowerCase() || "";
            let aTableData = this.getView().getModel("DataTableModel").getData();
            // --- Suggest skill strings ---
            let aMatchingSkillStrings = aTableData
                .map(item => item.Skills?.trim())
                .filter(skillStr => {
                    if (!skillStr) return false;
                    return skillStr
                        .split(",")
                        .some(skill => skill.trim().toLowerCase().includes(sValue));
                });
            let aUniqueSkillStrings = [...new Set(aMatchingSkillStrings)];
            let aSuggestionItems = aUniqueSkillStrings.map(skill => ({ skill }));
            let oSuggestModel = new sap.ui.model.json.JSONModel({ skills: aSuggestionItems });
            this.getView().setModel(oSuggestModel, "skillModel");
            let aFilteredCandidates = aTableData.filter(item => {
                if (!item.Skills) return false;
                return item.Skills
                    .split(",")
                    .some(skill => skill.trim().toLowerCase().includes(sValue));
            });
            let oFilteredModel = new sap.ui.model.json.JSONModel(aFilteredCandidates);
            this.getView().setModel(oFilteredModel, "filteredModel");
        }
    });
});