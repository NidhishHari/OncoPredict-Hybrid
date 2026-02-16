package com.oncopredict.java_backend.dto;

import java.util.List;

public class BiomarkerRequest {

    private List<Double> gene_expression;
    private List<Double> protein_expression;

    public List<Double> getGene_expression() {
        return gene_expression;
    }

    public void setGene_expression(List<Double> gene_expression) {
        this.gene_expression = gene_expression;
    }

    public List<Double> getProtein_expression() {
        return protein_expression;
    }

    public void setProtein_expression(List<Double> protein_expression) {
        this.protein_expression = protein_expression;
    }
}
