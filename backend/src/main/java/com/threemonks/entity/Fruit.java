package com.threemonks.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "fruits")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Fruit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String imageUrl;

    @Column(name = "short_code")
    private Integer shortCode;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "eligible_for_shot", nullable = false)
    private Boolean eligibleForShot = true;

    @Column(name = "eligible_for_blend", nullable = false)
    private Boolean eligibleForBlend = true;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
